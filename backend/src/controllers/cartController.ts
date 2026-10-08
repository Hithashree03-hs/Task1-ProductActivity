import { Response } from 'express';
import mongoose from 'mongoose';

import { AuthRequest } from '../middleware/auth';
import Cart from '../models/Cart';
import Product from '../models/Product';
import { getIO } from '../sockets/server';
import { recordProductInteraction } from '../services/recentlyViewedService';
import { ActivityType } from '../models/ProductActivity';
import NotificationLog from '../models/NotificationLog';

const notifyCartUpdated = (userId: mongoose.Types.ObjectId): void => {
  getIO().to(`user:${userId.toString()}`).emit('cartUpdated');
  void NotificationLog.updateMany({ userId, category: 'cart', status: 'SCHEDULED' }, { $set: { status: 'CANCELLED' } }).catch((error) => console.error('Could not cancel stale cart reminders:', error));
};

interface CartItemInput {
  productId: string;
  quantity?: number;
  size?: string;
  color?: string;
}

interface ProductVariantData {
  sizes?: string[];
  colors?: string[];
}

const getUserObjectId = (req: AuthRequest): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(req.userId);
};

const normalizeVariant = (
  value?: string
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
};

const variantsMatch = (
  item: {
    size?: string;
    color?: string;
  },
  size?: string,
  color?: string
): boolean => {
  return (
    (item.size ?? undefined) === (size ?? undefined) &&
    (item.color ?? undefined) === (color ?? undefined)
  );
};

const getProductVariantData = (
  product: unknown
): ProductVariantData => {
  const productData = product as {
    sizes?: unknown;
    colors?: unknown;
  };

  return {
    sizes: Array.isArray(productData.sizes)
      ? productData.sizes.filter(
          (value): value is string =>
            typeof value === 'string'
        )
      : [],

    colors: Array.isArray(productData.colors)
      ? productData.colors.filter(
          (value): value is string =>
            typeof value === 'string'
        )
      : [],
  };
};

const validateVariant = (
  product: unknown,
  size?: string,
  color?: string
): string | null => {
  const { sizes, colors } =
    getProductVariantData(product);

  if (
    size &&
    sizes &&
    sizes.length > 0 &&
    !sizes.includes(size)
  ) {
    return `Invalid size: ${size}`;
  }

  if (
    color &&
    colors &&
    colors.length > 0 &&
    !colors.includes(color)
  ) {
    return `Invalid color: ${color}`;
  }

  return null;
};

const getPopulatedCart = async (
  userId: mongoose.Types.ObjectId
) => {
  return Cart.findOne({ userId })
    .populate('items.productId')
    .lean();
};

/**
 * ADD TO CART
 *
 * POST /cart/add
 *
 * Body:
 * {
 *   productId,
 *   quantity?,
 *   size?,
 *   color?
 * }
 *
 * Identical product + size + color variants
 * are merged into one cart item.
 */
export const addToCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const {
      productId,
      quantity = 1,
      size,
      color,
    }: CartItemInput = req.body;

    if (!productId) {
      res.status(400).json({
        message: 'productId is required',
      });
      return;
    }

    if (
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      res.status(400).json({
        message: 'Invalid productId',
      });
      return;
    }

    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      res.status(400).json({
        message:
          'quantity must be a positive integer',
      });
      return;
    }

    const normalizedSize = normalizeVariant(size);
    const normalizedColor = normalizeVariant(color);

    const product = await Product.findById(
      productId
    ).lean();

    if (!product) {
      res.status(404).json({
        message: 'Product not found',
      });
      return;
    }

    const variantError = validateVariant(
      product,
      normalizedSize,
      normalizedColor
    );

    if (variantError) {
      res.status(400).json({
        message: variantError,
      });
      return;
    }

    if (product.stock < quantity) {
      res.status(400).json({
        message: `Only ${product.stock} item(s) available in stock`,
        availableStock: product.stock,
      });
      return;
    }

    const userId = getUserObjectId(req);

    const session =
      await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        let cart = await Cart.findOne({
          userId,
        }).session(session);

        if (!cart) {
          cart = new Cart({
            userId,
            items: [
              {
                productId:
                  new mongoose.Types.ObjectId(
                    productId
                  ),
                quantity,
                priceAtAdd: product.price,
                size: normalizedSize,
                color: normalizedColor,
                savedForLater: false,
              },
            ],
          });

          await cart.save({ session });
          return;
        }

        const existingItem = cart.items.find(
          (item) =>
            !item.savedForLater &&
            item.productId.toString() ===
              productId &&
            variantsMatch(
              item,
              normalizedSize,
              normalizedColor
            )
        );

        if (existingItem) {
          const newQuantity =
            existingItem.quantity + quantity;

          if (newQuantity > product.stock) {
            throw new Error(
              `Only ${product.stock} item(s) available in stock`
            );
          }

          existingItem.quantity = newQuantity;
        } else {
          cart.items.push({
            productId:
              new mongoose.Types.ObjectId(
                productId
              ),
            quantity,
            priceAtAdd: product.price,
            size: normalizedSize,
            color: normalizedColor,
            savedForLater: false,
          });
        }

        await cart.save({ session });
      });
    } finally {
      await session.endSession();
    }

    notifyCartUpdated(userId);
    await recordProductInteraction(userId.toString(), productId, ActivityType.CART);
    const cart = await getPopulatedCart(userId);

    res.status(200).json({
      message: 'Product added to cart',
      cart: cart ?? { items: [] },
    });
  } catch (error) {
    console.error(
      'Add to cart error:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to add product to cart';

    res.status(400).json({
      message,
    });
  }
};

/**
 * UPDATE CART QUANTITY
 *
 * PATCH /cart/:productId
 *
 * Body:
 * {
 *   quantity,
 *   size?,
 *   color?,
 *   itemId?
 * }
 *
 * quantity <= 0 removes the item.
 */
export const updateCartQuantity = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const productId = String(
      req.params.productId
    );

    const {
      quantity,
      size,
      color,
      itemId,
      updateVariant,
    } = req.body;

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      res.status(400).json({
        message: 'Invalid productId',
      });
      return;
    }

    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity)
    ) {
      res.status(400).json({
        message: 'quantity must be an integer',
      });
      return;
    }

    const normalizedSize =
      normalizeVariant(size);

    const normalizedColor =
      normalizeVariant(color);

    const product = await Product.findById(
      productId
    ).lean();

    if (!product) {
      res.status(404).json({
        message: 'Product not found',
      });
      return;
    }

    if (quantity > product.stock) {
      res.status(400).json({
        message: `Only ${product.stock} item(s) available in stock`,
        availableStock: product.stock,
      });
      return;
    }

    const userId = getUserObjectId(req);

    const session =
      await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({
          userId,
        }).session(session);

        if (!cart) {
          throw new Error('Cart not found');
        }

        const item =
          cart.items.find((cartItem) => {
            if (itemId) {
              return (
                String(
                  (cartItem as {
                    _id?: mongoose.Types.ObjectId;
                  })._id
                ) === String(itemId)
              );
            }

            return (
              cartItem.productId.toString() ===
                productId &&
              !cartItem.savedForLater &&
              variantsMatch(
                cartItem,
                normalizedSize,
                normalizedColor
              )
            );
          });

        if (!item) {
          throw new Error(
            'Product not found in cart'
          );
        }

        if (quantity <= 0) {
          const index =
            cart.items.findIndex(
              (cartItem) =>
                String(
                  (cartItem as {
                    _id?: mongoose.Types.ObjectId;
                  })._id
                ) ===
                String(
                  (item as {
                    _id?: mongoose.Types.ObjectId;
                  })._id
                )
            );

          if (index !== -1) {
            cart.items.splice(index, 1);
          }
        } else {
          if (updateVariant) {
            const variantError = validateVariant(
              product,
              normalizedSize,
              normalizedColor
            );
            if (variantError) {
              throw new Error(variantError);
            }

            const matchingItem = cart.items.find(
              (cartItem) =>
                String((cartItem as { _id?: mongoose.Types.ObjectId })._id) !==
                  String((item as { _id?: mongoose.Types.ObjectId })._id) &&
                cartItem.productId.toString() === productId &&
                !cartItem.savedForLater &&
                variantsMatch(cartItem, normalizedSize, normalizedColor)
            );

            if (matchingItem) {
              const mergedQuantity = matchingItem.quantity + quantity;
              if (mergedQuantity > product.stock) {
                throw new Error(`Only ${product.stock} item(s) available in stock`);
              }
              matchingItem.quantity = mergedQuantity;
              const oldIndex = cart.items.findIndex(
                (cartItem) => String((cartItem as { _id?: mongoose.Types.ObjectId })._id) ===
                  String((item as { _id?: mongoose.Types.ObjectId })._id)
              );
              if (oldIndex !== -1) cart.items.splice(oldIndex, 1);
            } else {
              item.size = normalizedSize;
              item.color = normalizedColor;
              item.quantity = quantity;
            }
          } else {
            item.quantity = quantity;
          }
        }

        await cart.save({ session });
      });
    } finally {
      await session.endSession();
    }

    notifyCartUpdated(userId);
    const cart = await getPopulatedCart(userId);

    res.status(200).json({
      message:
        quantity <= 0
          ? 'Product removed from cart'
        : updateVariant ? 'Cart variant updated' : 'Cart quantity updated',
      cart: cart ?? { items: [] },
    });
  } catch (error) {
    console.error(
      'Update cart quantity error:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update cart quantity';

    res.status(400).json({
      message,
    });
  }
};

/**
 * GET CART
 *
 * GET /cart
 */
export const getCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const cart = await getPopulatedCart(
      getUserObjectId(req)
    );

    if (!cart) {
      res.status(200).json({
        cart: {
          items: [],
        },
      });
      return;
    }

    const validItems = cart.items.filter(
      (item) => item.productId !== null
    );

    res.status(200).json({
      cart: {
        ...cart,
        items: validItems,
      },
    });
  } catch (error) {
    console.error(
      'Get cart error:',
      error
    );

    res.status(500).json({
      message: 'Failed to load cart',
    });
  }
};

/**
 * SAVE FOR LATER
 *
 * PATCH /cart/save-for-later/:itemId
 */
export const saveForLater = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const itemId = String(
      req.params.itemId
    );

    if (
      !itemId ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      res.status(400).json({
        message: 'Invalid cart item ID',
      });
      return;
    }

    const userId = getUserObjectId(req);

    const session =
      await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({
          userId,
        }).session(session);

        if (!cart) {
          throw new Error('Cart not found');
        }

        const itemIndex =
          cart.items.findIndex(
            (cartItem) =>
              String(
                (cartItem as {
                  _id?: mongoose.Types.ObjectId;
                })._id
              ) === itemId
          );

        if (itemIndex === -1) {
          throw new Error(
            'Cart item not found'
          );
        }

        const item =
          cart.items[itemIndex];

        if (item.savedForLater) {
          throw new Error(
            'Item is already saved for later'
          );
        }

        item.savedForLater = true;

        await cart.save({ session });
      });
    } finally {
      await session.endSession();
    }

    notifyCartUpdated(userId);
    const cart = await getPopulatedCart(userId);

    res.status(200).json({
      message: 'Item saved for later',
      cart: cart ?? { items: [] },
    });
  } catch (error) {
    console.error(
      'Save for later error:',
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : 'Failed to save item for later',
    });
  }
};

/**
 * MOVE SAVED ITEM BACK TO CART
 *
 * PATCH /cart/move-to-cart/:itemId
 */
export const moveToCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const itemId = String(
      req.params.itemId
    );

    if (
      !itemId ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      res.status(400).json({
        message: 'Invalid cart item ID',
      });
      return;
    }

    const userId = getUserObjectId(req);

    const session =
      await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({
          userId,
        }).session(session);

        if (!cart) {
          throw new Error('Cart not found');
        }

        const itemIndex =
          cart.items.findIndex(
            (cartItem) =>
              String(
                (cartItem as {
                  _id?: mongoose.Types.ObjectId;
                })._id
              ) === itemId
          );

        if (itemIndex === -1) {
          throw new Error(
            'Saved item not found'
          );
        }

        const item =
          cart.items[itemIndex];

        if (!item.savedForLater) {
          throw new Error(
            'Item is already in the cart'
          );
        }

        const product =
          await Product.findById(
            item.productId
          )
            .session(session)
            .lean();

        if (!product) {
          throw new Error(
            'Product no longer exists'
          );
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Only ${product.stock} item(s) available in stock`
          );
        }

        const duplicateCartItem =
          cart.items.find(
            (cartItem, index) =>
              index !== itemIndex &&
              !cartItem.savedForLater &&
              cartItem.productId.toString() ===
                item.productId.toString() &&
              variantsMatch(
                cartItem,
                item.size,
                item.color
              )
          );

        if (duplicateCartItem) {
          const newQuantity =
            duplicateCartItem.quantity +
            item.quantity;

          if (newQuantity > product.stock) {
            throw new Error(
              `Only ${product.stock} item(s) available in stock`
            );
          }

          duplicateCartItem.quantity =
            newQuantity;

          cart.items.splice(
            itemIndex,
            1
          );
        } else {
          item.savedForLater = false;
        }

        await cart.save({ session });
      });
    } finally {
      await session.endSession();
    }

    notifyCartUpdated(userId);
    const cart = await getPopulatedCart(userId);

    res.status(200).json({
      message: 'Item moved to cart',
      cart: cart ?? { items: [] },
    });
  } catch (error) {
    console.error(
      'Move to cart error:',
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : 'Failed to move item to cart',
    });
  }
};

/**
 * REMOVE SAVED ITEM
 *
 * DELETE /cart/saved/:itemId
 */
export const removeSavedItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        message: 'Authentication required',
      });
      return;
    }

    const itemId = String(
      req.params.itemId
    );

    if (
      !itemId ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      res.status(400).json({
        message: 'Invalid cart item ID',
      });
      return;
    }

    const userId = getUserObjectId(req);

    const session =
      await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({
          userId,
        }).session(session);

        if (!cart) {
          throw new Error('Cart not found');
        }

        const itemIndex =
          cart.items.findIndex(
            (cartItem) =>
              String(
                (cartItem as {
                  _id?: mongoose.Types.ObjectId;
                })._id
              ) === itemId
          );

        if (itemIndex === -1) {
          throw new Error(
            'Saved item not found'
          );
        }

        const item =
          cart.items[itemIndex];

        if (!item.savedForLater) {
          throw new Error(
            'Item is not saved for later'
          );
        }

        cart.items.splice(
          itemIndex,
          1
        );

        await cart.save({ session });
      });
    } finally {
      await session.endSession();
    }

    notifyCartUpdated(userId);
    const cart = await getPopulatedCart(userId);

    res.status(200).json({
      message: 'Saved item removed',
      cart: cart ?? { items: [] },
    });
  } catch (error) {
    console.error(
      'Remove saved item error:',
      error
    );

    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : 'Failed to remove saved item',
    });
  }
};

/**
 * Validate current cart inventory and price snapshots before checkout.
 * POST /cart/validate
 */
export const validateCart = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const userId = getUserObjectId(req);
    const cart = await Cart.findOne({ userId });
    const issues: Array<{
      itemId: string;
      productId: string;
      productName: string;
      type: 'unavailable' | 'stock' | 'price';
      availableStock?: number;
      quantity?: number;
      oldPrice?: number;
      newPrice?: number;
    }> = [];

    if (!cart) {
      res.status(200).json({
        valid: true,
        issues,
        cart: { items: [] },
      });
      return;
    }

    let cartChanged = false;
    const activeItems = cart.items.filter((item) => !item.savedForLater);

    for (const item of activeItems) {
      const product = await Product.findById(item.productId).lean();
      const itemId = String((item as { _id?: mongoose.Types.ObjectId })._id);
      const productId = item.productId.toString();

      if (!product) {
        issues.push({
          itemId,
          productId,
          productName: 'A product in your cart',
          type: 'unavailable',
        });
        cart.items = cart.items.filter(
          (cartItem) => String((cartItem as { _id?: mongoose.Types.ObjectId })._id) !== itemId
        ) as typeof cart.items;
        cartChanged = true;
        continue;
      }

      if (product.stock < item.quantity) {
        issues.push({
          itemId,
          productId,
          productName: product.name,
          type: 'stock',
          availableStock: product.stock,
          quantity: item.quantity,
        });
      }

      if (typeof item.priceAtAdd === 'number' && item.priceAtAdd !== product.price) {
        issues.push({
          itemId,
          productId,
          productName: product.name,
          type: 'price',
          oldPrice: item.priceAtAdd,
          newPrice: product.price,
        });
      }

      if (item.priceAtAdd !== product.price) {
        item.priceAtAdd = product.price;
        cartChanged = true;
      }
    }

    if (cartChanged) {
      await cart.save();
      notifyCartUpdated(userId);
    }

    const currentCart = await getPopulatedCart(userId);
    res.status(200).json({
      valid: issues.length === 0,
      issues,
      cart: currentCart ?? { items: [] },
    });
  } catch (error) {
    console.error('Cart validation error:', error);
    res.status(500).json({ message: 'Failed to validate cart' });
  }
};

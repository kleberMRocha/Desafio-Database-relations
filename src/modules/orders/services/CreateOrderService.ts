import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer)
      throw new AppError('could not find any custumer whith this id');

    const existentProducts = await this.productsRepository.findAllById(
      products,
    );

    if (!existentProducts.length)
      throw new AppError('could not find any produtcs');

    const existentProductsIds = existentProducts.map(product => product.id);

    const checkIdsProducts = products.filter(
      product => !existentProductsIds.includes(product.id),
    );

    if (checkIdsProducts.length) {
      throw new AppError(`
      could not find any produtcs ${checkIdsProducts[0].id}
       `);
    }

    const findProductsWhithNoQuantityAvailabe = products.filter(product => {
      existentProducts.filter(p => p.id === product.id)[0].quantity <
        product.quantity;
    });

    if (findProductsWhithNoQuantityAvailabe.length) {
      throw new AppError(`
       if(findProductsWhithNoQuantityAvailabe.length){
               the quantity ${checkIdsProducts[0].id}
                is not availabe for ${findProductsWhithNoQuantityAvailabe[0].id}
          `);
    }

    const serializedProducts = products.map(product => ({
      product_id:product.id,
      quantity: product.quantity,
      price: existentProducts.filter(p => p.id  === product.id)[0].price
    }));


    const order = await this.ordersRepository.create({
      customer,
      products:serializedProducts
    });

    const orderProductsQuantity = products
    .map(product => ({
      id:product.id,
      quantity:existentProducts
      .filter(p => p.id === product.id )[0].quantity - product.quantity
    }));

    await this.productsRepository.updateQuantity(orderProductsQuantity);

    return order;

  }
}

export default CreateOrderService;

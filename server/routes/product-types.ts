import { createCrudRouter } from './crud-factory.js';
import { productTypes } from '../../drizzle/schema.js';

export default createCrudRouter(productTypes, 'product_type');

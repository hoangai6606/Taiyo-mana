import { createCrudRouter } from './crud-factory.js';
import { productStyles } from '../../drizzle/schema.js';

export default createCrudRouter(productStyles, 'product_style');

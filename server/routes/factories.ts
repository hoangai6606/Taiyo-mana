import { createCrudRouter } from './crud-factory.js';
import { factories } from '../../drizzle/schema.js';

export default createCrudRouter(factories, 'factory');

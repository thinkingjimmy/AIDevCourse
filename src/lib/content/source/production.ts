import publicCatalog from '@catalog';
import type { Catalog } from '../model';

export function readCatalogSnapshot(): Catalog { return publicCatalog as Catalog; }

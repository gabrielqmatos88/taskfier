import { api } from '../../api/client';
export async function restoreDeletedCard(id) { return api.restoreCard(id); }

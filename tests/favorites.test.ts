import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
import { loadFavorites, upsertFavorite, writeFavorites } from '../services/favoritesService';
const target = { id: 'a', name: 'place', coordinate: { latitude: 33.59, longitude: -7.62 } };
beforeEach(() => { vi.resetAllMocks(); });
describe('saved places', () => {
  it('persists and reloads home without duplicate slots when changed', async () => {
    const first = upsertFavorite([], target, 'home', 'دارنا');
    const next = upsertFavorite(first, { ...target, coordinate: { latitude: 34, longitude: -7 } }, 'home', 'الدار الجديدة');
    expect(next).toHaveLength(1);
    await writeFavorites(next);
    storage.getItem.mockResolvedValue(storage.setItem.mock.calls[0]![1]);
    expect(await loadFavorites()).toEqual(next);
  });
  it('keeps separate custom places and other categories', () => {
    const first = upsertFavorite([], target, 'other', 'أ');
    const second = upsertFavorite(first, target, 'other', 'ب');
    expect(upsertFavorite(second, target, 'gym', 'الرياضة')).toHaveLength(3);
  });
  it('surfaces corrupt storage and write errors without overwriting data', async () => {
    storage.getItem.mockResolvedValue('{broken');
    await expect(loadFavorites()).rejects.toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
    storage.setItem.mockRejectedValue(new Error('disk full'));
    await expect(writeFavorites(upsertFavorite([], target, 'work', 'الخدمة'))).rejects.toThrow('disk full');
  });
  it('rejects invalid coordinates and blank place names', () => {
    expect(() => upsertFavorite([], target, 'home', ' ')).toThrow();
    expect(() => upsertFavorite([], { ...target, coordinate: { latitude: 999, longitude: 0 } }, 'school', 'مدرسة')).toThrow();
  });
});

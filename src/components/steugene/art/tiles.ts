// 🏫 St. Eugene 7 (§24b) — Minecraft block colours, shared by the floors and the boxes.
import type { SeTile } from '../../../steugene/types'

/** Block faces: [base, shadow, highlight]. Flat enough to read at 12 px a block. */
export const TILES: Record<SeTile, [string, string, string]> = {
  grass: ['#5fa83a', '#4a8a2a', '#7cc94f'],
  dirt: ['#8b5a2b', '#6b4220', '#a06a38'],
  stone: ['#8b8b8b', '#6d6d6d', '#a3a3a3'],
  plank: ['#b38a52', '#93703f', '#c9a066'],
  glass: ['#bfe9f7', '#8fcde3', '#e8faff'],
  water: ['#3f76e4', '#2c58b8', '#6f9cf0'],
  sand: ['#dbcf8e', '#c4b672', '#ece2a8'],
  wool: ['#e9ecec', '#c9cfcf', '#ffffff'],
  brick: ['#9b4a36', '#7a3626', '#b86450'],
  gold: ['#f5d742', '#d1ae1c', '#fff08a'],
  diamond: ['#5de8e0', '#2bb5ae', '#a8fff9'],
  obsidian: ['#2a1b3d', '#170e24', '#4a3266'],
}

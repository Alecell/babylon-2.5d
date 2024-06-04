import { Map } from "../interfaces/map";

type GameStore = {
  map: Map | null;
};

export const gameStore = (function (): GameStore {
  return {
    map: null,
  };
})();

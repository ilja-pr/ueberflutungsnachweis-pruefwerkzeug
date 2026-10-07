import { DEFAULT_DURATIONS } from '../../core/floodProof';
import type { Inputs } from './types';

let idCounter = 0;
export const newId = () => `a${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** Beispielwerte: keine echten KOSTRA-Daten, keine echten Produktdaten! */
export function defaultInputs(): Inputs {
  return {
    projectName: 'Beispielobjekt',
    requestNo: '',
    rcIndex: '',
    rainFrequency: 5,
    returnPeriodOverride: null,
    areas: [
      { id: newId(), surfaceUid: 2, manualName: '', area: 600, csCustom: null, isRoofCustom: true },
      { id: newId(), surfaceUid: 16, manualName: '', area: 350, csCustom: null, isRoofCustom: false },
    ],
    totalAreaOverride: null,
    excludeCat7: false,
    durations: [...DEFAULT_DURATIONS],
    rainUnit: 'r',
    rain: {
      '2': { '5': 255, '10': 175, '15': 138 },
      '30': { '5': 480, '10': 340, '15': 270 },
      '100': { '5': 590, '10': 415, '15': 330 },
    },
    rigole: {
      mode: 'blocks',
      infiltrationType: 1,
      blocksLength: 10,
      blocksWidth: 3,
      layers: 2,
      extraBloc: false,
      blocLength: 0.8,
      blocWidth: 0.8,
      displayBlocHeight: 0.42,
      extraBlocHeight: 0.21,
      length: 8,
      width: 2.4,
      height: 0.84,
      volumeDirect: 15.32,
      storageCoeff: 0.95,
      swaleVolume: 0,
      availableLength: 10,
    },
    extras: { qVoll: null },
    excel: { vRueckMax: null, vVorh: null },
  };
}

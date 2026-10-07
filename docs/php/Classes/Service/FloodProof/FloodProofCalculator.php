<?php

declare(strict_types=1);

/*
 * Überflutungsnachweis nach DIN 1986-100 (Gl. 20) – Rückhaltung ausschließlich in der Anlage
 * (keine zusätzlichen Rückstau-/Überflutungsflächen auf dem Grundstück).
 *
 * Nur für Konfigurationen mit Richtlinie DWA-A 138-1 (newGuideline = 1), Objektland Deutschland,
 * Entwässerungsart Rigole (1) oder Mulden-Rigole (2).
 *
 * Reine Rechenklasse ohne TYPO3-Abhängigkeiten -> einfach testbar.
 * Namespace an die Extension anpassen (Vendor-Teil im Code nachsehen).
 */

namespace Vendor\IgGrafInfiltration\Service\FloodProof;

final class FloodProofCalculator
{
    /** Ab dieser befestigten Fläche ist der Nachweis nach DIN 1986-100 Pflicht (m²). */
    public const MANDATORY_AREA_THRESHOLD = 800.0;

    /** Gewählte Regenhäufigkeit > diesem Wert => Nachweis mit 100-jährlichem Regen statt 30-jährlich. */
    public const RAIN_FREQUENCY_SWITCH = 10;

    /** Bemessungsregen für die Entwässerungsanlage im Abzugsterm (immer 2-jährlich). */
    public const DRAIN_RETURN_PERIOD = 2;

    /** Standard-Dauerstufen in Minuten (DIN 1986-100: 5, 10, 15 min). Über Settings überschreibbar. */
    public const DEFAULT_DURATIONS = [5, 10, 15];

    /** Flächenkategorien aus #areaGuideline1381 (surfaceCategory) die als Dachfläche zählen. */
    public const ROOF_CATEGORIES = [1, 2, 3];

    /**
     * Regel: gewählte Regenhäufigkeit (configuration.rainFrequency) > 10 Jahre => 100-jährlich, sonst 30-jährlich.
     * null = keine Regenhäufigkeit gesendet (Mulden-Rigole + DWA-A 138-1, VSO-489) => Fallback 30-jährlich.
     */
    public static function determineReturnPeriod(?int $rainFrequency): int
    {
        return $rainFrequency !== null && $rainFrequency > self::RAIN_FREQUENCY_SWITCH ? 100 : 30;
    }

    /**
     * Regenspende r [l/(s·ha)] aus Niederschlagshöhe hN [mm] und Dauer D [min],
     * falls die Regendaten-Tabelle hN statt rN speichert.
     */
    public static function rainIntensityFromDepth(float $depthMm, int $durationMin): float
    {
        return $depthMm * 10000.0 / ($durationMin * 60.0);
    }

    /**
     * Vorhandenes Speichervolumen der Anlage [m³] aus der FINALEN Geometrie.
     *
     * @param float $length          L_R  [m]  finale Rigolenlänge
     * @param float $width           B_R  [m]  finale Rigolenbreite
     * @param float $height          H_R  [m]  finale Rigolenhöhe (Lagen × Blockhöhe)
     * @param float $storageCoeff    s_R  [-]  Speicherkoeffizient des Produkts (z. B. 0,95)
     * @param float $swaleVolume     V_M  [m³] Muldenvolumen (nur Mulden-Rigole, sonst 0)
     */
    public static function storageVolume(
        float $length,
        float $width,
        float $height,
        float $storageCoeff,
        float $swaleVolume = 0.0
    ): float {
        return $length * $width * $height * $storageCoeff + $swaleVolume;
    }

    /**
     * Geometrie der Rigole aus Blockanzahlen + Produktdaten (gleiche Größen wie Articletool).
     *
     * @return array{length:float, width:float, height:float, installHeight:float}
     */
    public static function geometryFromBlocks(
        int $blocksLength,
        int $blocksWidth,
        int $layers,
        bool $extraBloc,
        float $blocLength,
        float $blocWidth,
        float $displayBlocHeight,
        float $extraBlocHeight = 0.0,
        float $basePlateHeight = 0.0
    ): array {
        $height = $layers * $displayBlocHeight + ($extraBloc ? $extraBlocHeight : 0.0);
        return [
            'length' => $blocksLength * $blocLength,
            'width' => $blocksWidth * $blocWidth,
            'height' => $height,                       // Speicherhöhe (ohne Bodenplatte)
            'installHeight' => $height + $basePlateHeight,
        ];
    }

    /**
     * Vorschlag bei "nicht erfüllt": wie viele Blockreihen in Länge zusätzlich nötig sind.
     *
     * @return array{additionalRows:int, newLength:float, fitsAvailableLength:bool}|null  null = bereits erfüllt
     */
    public static function enlargementSuggestion(
        float $missingVolume,
        float $rigoleLength,
        float $rigoleWidth,
        float $rigoleHeight,
        float $storageCoeff,
        float $blocLength,
        ?float $availableLength = null
    ): ?array {
        if ($missingVolume <= 0) {
            return null;
        }
        $volumePerRow = $blocLength * $rigoleWidth * $rigoleHeight * $storageCoeff;
        if ($volumePerRow <= 0) {
            throw new \InvalidArgumentException('Volumen je Blockreihe ist 0');
        }
        $rows = (int)ceil($missingVolume / $volumePerRow);
        $newLength = $rigoleLength + $rows * $blocLength;
        return [
            'additionalRows' => $rows,
            'newLength' => $newLength,
            'fitsAvailableLength' => $availableLength === null || $newLength <= $availableLength + 1e-9,
        ];
    }

    /**
     * Hauptberechnung.
     *
     * @param list<array{name:string, area:float, cs:float, isRoof:bool}> $areas
     *        angeschlossene Flächen (aus configuration.surfaceValue[n])
     * @param array<int, array<int, float>> $rain
     *        Regenspenden r(D,T) in l/(s·ha): $rain[T][D], benötigt T = 2 und T = 30 bzw. 100
     * @param int|null   $rainFrequency      configuration.rainFrequency (gewählte Regenhäufigkeit, null bei MuRi 138-1)
     * @param float      $storageVolume      V_vorh [m³] der finalen Anlage (siehe storageVolume())
     * @param float|null $totalAreaOverride  A_ges manuell durch Mitarbeiter (null = Summe der Flächen)
     * @param list<int>  $durations          Dauerstufen in Minuten
     *
     * @return array<string, mixed>
     */
    public function calculate(
        array $areas,
        array $rain,
        ?int $rainFrequency,
        float $storageVolume,
        ?float $totalAreaOverride = null,
        array $durations = self::DEFAULT_DURATIONS
    ): array {
        $returnPeriod = self::determineReturnPeriod($rainFrequency);

        // 1) Flächen aufteilen
        $aDach = 0.0;      // A_Dach   [m²]
        $aFaG = 0.0;       // A_FaG    [m²]
        $aDachCs = 0.0;    // Σ A_Dach,i · C_s,i  [m²]
        $aFaGCs = 0.0;     // Σ A_FaG,i  · C_s,i  [m²]
        $areaRows = [];

        foreach ($areas as $row) {
            $a = max(0.0, (float)$row['area']);
            $cs = (float)$row['cs'];
            if ($cs < 0.0 || $cs > 1.0) {
                throw new \InvalidArgumentException(sprintf('C_s außerhalb 0..1 bei "%s"', $row['name']));
            }
            if ($row['isRoof']) {
                $aDach += $a;
                $aDachCs += $a * $cs;
            } else {
                $aFaG += $a;
                $aFaGCs += $a * $cs;
            }
            $areaRows[] = [
                'name' => $row['name'],
                'group' => $row['isRoof'] ? 'Dach' : 'FaG',
                'area' => $a,
                'cs' => $cs,
                'areaCs' => $a * $cs,
            ];
        }

        $aGesSum = $aDach + $aFaG;
        $aGes = $totalAreaOverride !== null && $totalAreaOverride > 0 ? $totalAreaOverride : $aGesSum;

        // 2) Gl. 20 je Dauerstufe
        $rows = [];
        $vMax = 0.0;
        $dMax = null;

        foreach ($durations as $d) {
            if (!isset($rain[$returnPeriod][$d], $rain[self::DRAIN_RETURN_PERIOD][$d])) {
                throw new \RuntimeException(sprintf('Regendaten fehlen für T=%d bzw. T=2 bei D=%d min', $returnPeriod, $d));
            }
            $rT = (float)$rain[$returnPeriod][$d];
            $r2 = (float)$rain[self::DRAIN_RETURN_PERIOD][$d];

            $inflow = $rT * $aGes;                          // r(D,T) · A_ges
            $drain = $r2 * $aDachCs + $r2 * $aFaGCs;        // r(D,2) · (A_Dach·C_s + A_FaG·C_s)
            $v = ($inflow - $drain) * $d * 60 / (10000 * 1000); // [m³]
            $v = max(0.0, $v);

            $rows[] = [
                'duration' => $d,
                'rT' => $rT,
                'r2' => $r2,
                'vInflow' => $inflow * $d * 60 / 1e7,
                'vDrain' => $drain * $d * 60 / 1e7,
                'vRueck' => $v,
            ];

            if ($dMax === null || $v > $vMax) {
                $vMax = $v;
                $dMax = $d;
            }
        }

        // 3) Nachweis: Rückhaltung ausschließlich in der Anlage
        $passed = $storageVolume >= $vMax;

        return [
            'returnPeriod' => $returnPeriod,
            'returnPeriodReason' => match (true) {
                $rainFrequency === null => 'keine Regenhäufigkeit gewählt (Mulden-Rigole DWA-A 138-1) – Standard 30 Jahre',
                $rainFrequency > self::RAIN_FREQUENCY_SWITCH => sprintf('gewählte Regenhäufigkeit %d Jahre > %d Jahre', $rainFrequency, self::RAIN_FREQUENCY_SWITCH),
                default => sprintf('gewählte Regenhäufigkeit %d Jahre ≤ %d Jahre', $rainFrequency, self::RAIN_FREQUENCY_SWITCH),
            },
            'areas' => $areaRows,
            'aDach' => $aDach,
            'aFaG' => $aFaG,
            'aGes' => $aGes,
            'aGesIsOverride' => $aGes !== $aGesSum,
            'aDachCs' => $aDachCs,
            'aFaGCs' => $aFaGCs,
            'mandatory' => $aGes > self::MANDATORY_AREA_THRESHOLD,
            'rows' => $rows,
            'vRueckMax' => $vMax,
            'durationMax' => $dMax,
            'storageVolume' => $storageVolume,
            'utilization' => $storageVolume > 0 ? $vMax / $storageVolume : null,
            'reserve' => $storageVolume - $vMax,
            'passed' => $passed,
        ];
    }
}

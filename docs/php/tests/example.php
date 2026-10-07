<?php

declare(strict_types=1);

require __DIR__ . '/../Classes/Service/FloodProof/FloodProofCalculator.php';

use Vendor\IgGrafInfiltration\Service\FloodProof\FloodProofCalculator;

// BEISPIELWERTE (keine echten KOSTRA-Daten) – r(D,T) in l/(s·ha)
$rain = [
    2   => [5 => 255.0, 10 => 175.0, 15 => 138.0],
    30  => [5 => 480.0, 10 => 340.0, 15 => 270.0],
    100 => [5 => 590.0, 10 => 415.0, 15 => 330.0],
];

$areas = [
    ['name' => 'Dachflächen (Schrägdach) – Ziegel, Abdichtungsbahnen', 'area' => 600.0, 'cs' => 1.0, 'isRoof' => true],
    ['name' => 'Teildurchlässige Verkehrsflächen – Betonsteinpflaster in Sand', 'area' => 350.0, 'cs' => 0.9, 'isRoof' => false],
];

$storage = FloodProofCalculator::storageVolume(8.0, 2.4, 0.84, 0.95);
$calc = new FloodProofCalculator();

$asserts = 0;
$check = function (bool $ok, string $msg) use (&$asserts) {
    $asserts++;
    if (!$ok) {
        fwrite(STDERR, "FAIL: $msg\n");
        exit(1);
    }
};

// Fall 1: Regenhäufigkeit 5 Jahre -> 30-jährlich
$r = $calc->calculate($areas, $rain, 5, $storage);
$check($r['returnPeriod'] === 30, 'T=30 bei 5 Jahren');
$check(abs($r['aGes'] - 950) < 1e-9, 'A_ges');
// Handrechnung D=15: (270*950 - 138*(600*1.0+350*0.9)) * 900 / 1e7 = 11.7207
$check(abs($r['vRueckMax'] - 11.7207) < 1e-4, 'V_Rück,max D=15 = 11,72 m³ (ist ' . $r['vRueckMax'] . ')');
$check($r['durationMax'] === 15, 'maßgebende Dauer 15 min');
$check($r['mandatory'] === true, '> 800 m² => Pflicht');
$check($r['passed'] === true, 'Nachweis erfüllt bei V_vorh = 15,32 m³');

// Fall 2: genau 10 Jahre -> noch 30-jährlich
$check(FloodProofCalculator::determineReturnPeriod(10) === 30, '10 Jahre -> 30');
// Fall 3: 15 Jahre -> 100-jährlich
$check(FloodProofCalculator::determineReturnPeriod(15) === 100, '15 Jahre -> 100');
$r100 = $calc->calculate($areas, $rain, 20, $storage);
// D=15: (330*950 - 138*915) * 900 / 1e7 = (313500-126270)*0.00009 = 16.8507
$check(abs($r100['vRueckMax'] - 16.8507) < 1e-4, 'V_Rück,max T=100 (ist ' . $r100['vRueckMax'] . ')');
$check($r100['passed'] === false, 'T=100 nicht erfüllt mit 15,32 m³');

// Fall 3b: Mulden-Rigole 138-1 sendet keine rainFrequency (VSO-489) -> Fallback 30
$check(FloodProofCalculator::determineReturnPeriod(null) === 30, 'null -> 30');
$rNull = $calc->calculate($areas, $rain, null, $storage);
$check($rNull['returnPeriod'] === 30 && abs($rNull['vRueckMax'] - 11.7207) < 1e-4, 'MuRi ohne rainFrequency = T30');

// Fall 5: Geometrie aus Blöcken (Beispiel: Block 0,80 × 0,80 m, Lage 0,42 m, 10 × 3 Blöcke, 2 Lagen)
$g = FloodProofCalculator::geometryFromBlocks(10, 3, 2, false, 0.8, 0.8, 0.42, 0.21, 0.03);
$check(abs($g['length'] - 8.0) < 1e-9 && abs($g['width'] - 2.4) < 1e-9 && abs($g['height'] - 0.84) < 1e-9, 'Geometrie aus Blöcken');
$check(abs($g['installHeight'] - 0.87) < 1e-9, 'Einbauhöhe inkl. Bodenplatte');
$check(abs(FloodProofCalculator::storageVolume($g['length'], $g['width'], $g['height'], 0.95) - $storage) < 1e-9, 'V_vorh aus Blöcken = Beispiel');

// Fall 6: Vergrößerungsvorschlag bei T=100 (Fehlmenge 1,53 m³, je Reihe 0,8·2,4·0,84·0,95 = 1,532 m³)
$s = FloodProofCalculator::enlargementSuggestion(-$r100['reserve'], 8.0, 2.4, 0.84, 0.95, 0.8, 10.0);
$check($s['additionalRows'] === 1 && abs($s['newLength'] - 8.8) < 1e-9 && $s['fitsAvailableLength'], 'Vorschlag +1 Reihe -> 8,80 m');
$check(FloodProofCalculator::enlargementSuggestion(-$r['reserve'], 8.0, 2.4, 0.84, 0.95, 0.8) === null, 'kein Vorschlag wenn erfüllt');

// Fall 4: hN -> rN Umrechnung: 10 mm in 15 min = 111,1 l/(s·ha)
$check(abs(FloodProofCalculator::rainIntensityFromDepth(10, 15) - 111.111) < 1e-3, 'hN->rN');

echo "OK ($asserts Checks)\n\n";
foreach ([['T=30 (5 Jahre gewählt)', $r], ['T=100 (20 Jahre gewählt)', $r100]] as [$label, $res]) {
    echo "$label  V_vorh=" . round($storage, 2) . " m³\n";
    foreach ($res['rows'] as $row) {
        printf("  D=%2d  r(D,2)=%5.1f  r(D,T)=%5.1f  V_Rück=%6.2f m³\n", $row['duration'], $row['r2'], $row['rT'], $row['vRueck']);
    }
    printf("  max %.2f m³ bei D=%d -> %s (Auslastung %.0f %%)\n\n", $res['vRueckMax'], $res['durationMax'], $res['passed'] ? 'ERFÜLLT' : 'NICHT ERFÜLLT', $res['utilization'] * 100);
}

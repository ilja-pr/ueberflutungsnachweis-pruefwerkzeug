/* Codeschnipsel für die Einbau-Anleitung. Namen von Tabellen, Klassen und Gettern sind begründete Annahmen. */

export const SQL = String.raw`-- ext_tables.sql (Tabellenname im Code prüfen)
CREATE TABLE tx_iggrafinfiltration_domain_model_configuration (
    flood_proof_enabled       tinyint(1) unsigned DEFAULT '0' NOT NULL,
    flood_proof_total_area    double(11,2) DEFAULT NULL,                  -- A_ges überschrieben, NULL = Summe
    flood_proof_return_period smallint(5) unsigned DEFAULT '0' NOT NULL,  -- 30 | 100, berechnet
    flood_proof_volume_req    double(11,3) DEFAULT '0' NOT NULL,          -- max V_Rück [m³]
    flood_proof_volume_avail  double(11,3) DEFAULT '0' NOT NULL,          -- V_vorh [m³]
    flood_proof_passed        tinyint(1) unsigned DEFAULT '0' NOT NULL,
    flood_proof_result        mediumtext,                                 -- komplettes Ergebnis als JSON (für die PDF)
    flood_proof_calculated_at int(11) unsigned DEFAULT '0' NOT NULL
);

-- Flächenzeilen: dort, wo heute cm_custom liegt (Tabellenname im Code prüfen)
CREATE TABLE tx_iggrafinfiltration_domain_model_surfacevalue (
    cs_custom      double(4,2) DEFAULT NULL,
    is_roof_custom tinyint(1) unsigned DEFAULT '0' NOT NULL
);`;

export const MODEL = String.raw`// Classes/Domain/Model/Configuration.php
protected bool $floodProofEnabled = false;
protected ?float $floodProofTotalArea = null;
protected int $floodProofReturnPeriod = 0;
protected float $floodProofVolumeReq = 0.0;
protected float $floodProofVolumeAvail = 0.0;
protected bool $floodProofPassed = false;
protected string $floodProofResult = '';
protected int $floodProofCalculatedAt = 0;

// Dazu je Feld Getter und Setter im Stil der Extension, z. B.
public function isFloodProofEnabled(): bool { return $this->floodProofEnabled; }
public function setFloodProofEnabled(bool $v): void { $this->floodProofEnabled = $v; }
// ... gleiches Muster für die anderen sieben Felder

// Configuration/TCA/tx_iggrafinfiltration_domain_model_configuration.php (Spalten ergänzen)
'flood_proof_enabled' => ['exclude' => true, 'label' => 'Überflutungsnachweis erstellen', 'config' => ['type' => 'check', 'default' => 0]],
'flood_proof_total_area' => ['exclude' => true, 'label' => 'A_ges überschrieben [m²]', 'config' => ['type' => 'input', 'eval' => 'double2,null']],
// ... die übrigen Felder als readOnly-Inputs, damit der Mitarbeiter die Ergebnisse im Backend sieht`;

export const CALC = String.raw`# 1. Datei aus dem Paket kopieren
cp docs/php/Classes/Service/FloodProof/FloodProofCalculator.php  <extension>/Classes/Service/FloodProof/

# 2. In der Datei nur diese Zeile anpassen (echten Namespace der Extension nehmen)
namespace Vendor\IgGrafInfiltration\Service\FloodProof;

# 3. Test laufen lassen (reines PHP, braucht kein TYPO3)
php docs/php/tests/example.php      # erwartet: OK (18 Checks)

# 4. Bei Composer-Classmap
composer dump-autoload`;

export const RAIN = String.raw`// Regendaten-Repository erweitern (bestehende Klasse, Tabelle im Code prüfen)
/**
 * @param string    $rcIndex       z. B. "206112" (Zeile 206, Spalte 112)
 * @param list<int> $returnPeriods z. B. [2, 30]
 * @param list<int> $durations     z. B. [5, 10, 15]
 * @return array<int, array<int, float>>  [T => [D => r in l/(s·ha)]]
 */
public function findRainIntensities(string $rcIndex, array $returnPeriods, array $durations): array
{
    $out = [];
    // ... je (T, D) den Wert zum Rasterfeld aus der Regendaten-Tabelle lesen.
    // Liegt in der Tabelle die Niederschlagshöhe hN [mm] statt r:
    //   $r = FloodProofCalculator::rainIntensityFromDepth($hN, $d);
    return $out;   // fehlt ein Wert: Eintrag weglassen, der Rechner meldet es verständlich
}`;

export const SERVICE = String.raw`<?php
// Classes/Service/FloodProof/FloodProofService.php
declare(strict_types=1);

namespace Vendor\IgGrafInfiltration\Service\FloodProof;

final class FloodProofService
{
    public function __construct(
        private readonly SurfaceTypeRepository $surfaceTypeRepository,   // dasselbe Repo, das data-surface-types-map füttert
        private readonly RainDataRepository $rainDataRepository,
    ) {}

    /** Gating: Deutschland, DWA-A 138-1, Rigole oder Mulden-Rigole */
    public function isApplicable(Configuration $c): bool
    {
        return $c->getCountry() === 1
            && $c->getNewGuideline() === 1
            && in_array($c->getInfiltrationType(), [1, 2], true);
    }

    public function process(Configuration $c, FinalResult $final, array $settings): ?array
    {
        if (!$this->isApplicable($c) || !$c->isFloodProofEnabled()) {
            return null;
        }
        $durations = array_map('intval', explode(',', $settings['floodProof']['durations'] ?? '5,10,15'));

        $areas = [];
        foreach ($c->getSurfaceValues() as $sv) {
            $type = $sv->isManual() ? null : $this->surfaceTypeRepository->findByUid($sv->getSurfacetype());
            $areas[] = [
                'name'   => $sv->isManual() ? $sv->getSurfaceCustom() : $type->getCategoryName() . ' – ' . $type->getName(),
                'area'   => (float)$sv->getArea(),
                'cs'     => $sv->isManual() ? (float)$sv->getCsCustom() : (float)$type->getCs(),
                'isRoof' => $sv->isManual() ? $sv->isRoofCustom() : in_array($type->getCategory(), FloodProofCalculator::ROOF_CATEGORIES, true),
            ];
        }

        $rainFrequency = $c->getRainFrequency();   // null bei Mulden-Rigole 138-1 (VSO-489) → T = 30
        $T = FloodProofCalculator::determineReturnPeriod($rainFrequency);
        $rain = $this->rainDataRepository->findRainIntensities($c->getRcIndex(), [2, $T], $durations);

        $vAvail = $final->getStorageVolume()   // 1. Volumen aus der Bemessung, wenn vorhanden
            ?? FloodProofCalculator::storageVolume(   // 2. sonst aus den Blöcken
                $final->getLength(), $final->getWidth(), $final->getHeight(),
                $final->getProduct()->getStorageCoefficient(), $final->getSwaleVolume() ?? 0.0
            );

        $result = (new FloodProofCalculator())->calculate(
            $areas, $rain, $rainFrequency, $vAvail, $c->getFloodProofTotalArea(), $durations
        );

        $c->setFloodProofReturnPeriod($result['returnPeriod']);
        $c->setFloodProofVolumeReq($result['vRueckMax']);
        $c->setFloodProofVolumeAvail($result['storageVolume']);
        $c->setFloodProofPassed($result['passed']);
        $c->setFloodProofResult(json_encode($result, JSON_THROW_ON_ERROR));
        $c->setFloodProofCalculatedAt(time());
        return $result;   // Aufrufer persistiert und erzeugt danach die PDF
    }
}`;

export const CONF = String.raw`# Configuration/Services.yaml (nur nötig, falls Autowiring noch nicht aktiv ist)
services:
  Vendor\IgGrafInfiltration\Service\FloodProof\FloodProofService:
    public: true

# Configuration/TypoScript/setup.typoscript
plugin.tx_iggrafinfiltration.settings.floodProof.durations = 5,10,15`;

export const CTRL = String.raw`// Administration-Controller, direkt NACH der bestehenden finalen Berechnung
// und VOR dem Bauen der PDFs
try {
    $flood = $this->floodProofService->process($configuration, $finalResult, $this->settings);
} catch (\RuntimeException | \InvalidArgumentException $e) {
    // Regendaten fehlen oder C_s ungültig: verständliche Meldung, keine zweite PDF
    $this->addFlashMessage($e->getMessage(), 'Überflutungsnachweis', ContextualFeedbackSeverity::ERROR);
    $flood = null;
}
$this->configurationRepository->update($configuration);   // wie bisher persistieren

$pdfs = [$this->buildDesignPdf($configuration)];            // bestehende Bemessungs-PDF, unverändert
if ($flood !== null) {
    $pdfs[] = $this->floodProofPdf->render($configuration, $flood);   // NEU, zusätzliche Datei
}`;

export const FLUID = String.raw`<!-- Administration, Template der finalen Berechnung -->
<f:if condition="{floodProofApplicable}">
  <fieldset class="floodproof">
    <legend>Überflutungsnachweis DIN 1986-100</legend>
    <label>
      <f:form.checkbox property="floodProofEnabled" value="1" checked="{configuration.floodProofEnabled}" />
      Überflutungsnachweis erstellen
    </label>
    <f:if condition="{areaSum} > 800">
      <p class="hint">Pflicht ab 800 m² befestigter Fläche.</p>
    </f:if>
    <label>A_ges überschreiben (m²)
      <f:form.textfield property="floodProofTotalArea" placeholder="{areaSum}" />
    </label>
    <f:if condition="{configuration.floodProofCalculatedAt}">
      <p>Nachweis-Regen: {configuration.floodProofReturnPeriod}-jährlich ·
         erforderlich <f:format.number decimals="2" decimalSeparator="," thousandsSeparator=".">{configuration.floodProofVolumeReq}</f:format.number> m³ ·
         vorhanden <f:format.number decimals="2" decimalSeparator="," thousandsSeparator=".">{configuration.floodProofVolumeAvail}</f:format.number> m³ ·
         <f:if condition="{configuration.floodProofPassed}"><f:then>erfüllt</f:then><f:else>nicht erfüllt: Rigole vergrößern</f:else></f:if></p>
      <a href="{floodProofPdfUrl}">PDF Überflutungsnachweis</a>
    </f:if>
  </fieldset>
</f:if>`;

export const PDF = String.raw`<!-- Templates/Pdf/FloodProof.html (Kopf und Fuß wie die Bemessungs-PDF, gleiche Partials) -->
<f:variable name="r" value="{result}" />
<h1>Überflutungsnachweis</h1>
<p>nach DIN 1986-100 · Bemessung nach DWA-A 138-1 · {configuration.propertyName}, {configuration.street}, {configuration.propertyZip} {configuration.propertyCity}</p>

<div class="result {f:if(condition: r.passed, then: 'ok', else: 'bad')}">
  <f:if condition="{r.passed}"><f:then>Nachweis erfüllt</f:then><f:else>Nachweis nicht erfüllt</f:else></f:if>
  <!-- drei Zahlen: r.vRueckMax · r.storageVolume · r.utilization (als Prozent) -->
</div>

<!-- Eckdaten · Flächen: f:for each="{r.areas}" · Tabelle je Dauer: f:for each="{r.rows}", maßgebende Zeile: row.duration == r.durationMax -->
<!-- Rechenweg und Hinweise: feste Texte, siehe Bericht des Prüfwerkzeugs als Vorlage -->`;

export const JS = String.raw`// Kundenformular, AreaManagerNew.js: nur bei Flächenart "Manuell" zwei Felder zeigen,
// analog zur vorhandenen cmCustom-Logik (Selektoren an die Extension anpassen)
export const isManual = $row.find('[name$="[surfacetype]"]').val() === 'manual';
$row.find('.csCustomWrap, .isRoofCustomWrap').toggle(isManual);
// Validierung: csCustom >= cmCustom, sonst Fehlermeldung wie bei den anderen Feldern

<!-- Fluid-Template der Flächenzeile -->
<select name="configuration[surfaceValue][{n}][csCustom]">  <!-- 0,1 … 1,0 -->
<input type="checkbox" name="configuration[surfaceValue][{n}][isRoofCustom]" value="1"> Dachfläche`;

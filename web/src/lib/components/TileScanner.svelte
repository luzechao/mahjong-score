<script lang="ts">
  import { onDestroy } from "svelte";
  import { ALL_TILES } from "../agari";
  import { t } from "../i18n";
  import { recognizeTiles, type Detection } from "../recognition";
  import type { ScanError } from "../scanValidation";
  import Tile from "./Tile.svelte";

  interface Props {
    target: "hand" | "meld";
    onApply: (labels: string[]) => ScanError | null;
    onClose: () => void;
  }

  let { target, onApply, onClose }: Props = $props();
  const choices = [...ALL_TILES, "0m", "0p", "0s"];
  let imageUrl = $state("");
  let detections = $state<Detection[]>([]);
  let processing = $state(false);
  let completed = $state(false);
  let error = $state("");
  let disposed = false;

  onDestroy(() => {
    disposed = true;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  });

  async function selectPhoto(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || processing) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = URL.createObjectURL(file);
    detections = [];
    completed = false;
    error = "";
    processing = true;
    try {
      const image = new Image();
      image.src = imageUrl;
      await image.decode();
      const result = await recognizeTiles(image);
      if (!disposed) {
        detections = result;
        completed = true;
      }
    } catch (cause) {
      if (!disposed) {
        error = `${$t.recognitionFailed} ${cause instanceof Error ? cause.message : String(cause)}`;
      }
    } finally {
      if (!disposed) processing = false;
    }
  }

  function apply() {
    const problem = onApply(detections.map((detection) => detection.tile));
    if (problem) {
      const messages: Record<ScanError, string> = {
        empty: $t.scanEmpty,
        unknown: $t.scanUnknown,
        tooMany: $t.scanTooMany,
        unavailable: $t.scanUnavailable,
        sanma: $t.scanSanma,
        meld: $t.scanInvalidMeld,
      };
      error = messages[problem];
    } else {
      onClose();
    }
  }
</script>

<section class="scanner" aria-label={target === "hand" ? $t.scanHand : $t.scanMeld}>
  <div class="scanner-heading">
    <h3>{target === "hand" ? $t.scanHand : $t.scanMeld}</h3>
    <button type="button" class="btn btn-secondary" onclick={onClose}>{$t.cancel}</button>
  </div>
  <p>{target === "hand" ? $t.scanHandHelp : $t.scanMeldHelp}</p>
  <p>{$t.scanPrivacy}</p>
  <div class="photo-actions">
    <label class="btn btn-primary">
      {$t.takePhoto}
      <input type="file" accept="image/*" capture="environment" onchange={selectPhoto} disabled={processing} />
    </label>
    <label class="btn btn-secondary">
      {$t.choosePhoto}
      <input type="file" accept="image/*" onchange={selectPhoto} disabled={processing} />
    </label>
  </div>
  {#if processing}<p role="status">{$t.recognizing}</p>{/if}
  {#if error}<p class="scan-error" role="alert">{error}</p>{/if}
  {#if imageUrl}
    <div class="preview">
      <img src={imageUrl} alt="" />
      {#each detections as detection, index}
        {#if detection.box}
          <div
            class="detection-box"
            style:left="{detection.box[0] * 100}%"
            style:top="{detection.box[1] * 100}%"
            style:width="{detection.box[2] * 100}%"
            style:height="{detection.box[3] * 100}%"
            aria-hidden="true"
          ><span>{index + 1}</span></div>
        {/if}
      {/each}
    </div>
  {/if}
  {#if completed}
    <h4>{$t.reviewTiles}</h4>
    {#if detections.length === 0}<p>{$t.noTilesDetected}</p>{/if}
    <div class="detected-list">
      {#each detections as detection, index}
        <div class="detected-tile">
          <span>{index + 1}</span>
          {#if detection.tile}<Tile tile={detection.tile} size="sm" />{/if}
          <select
            aria-label="{$t.selectTile} {index + 1}"
            value={detection.tile}
            onchange={(event) => {
              detections[index] = { ...detection, tile: event.currentTarget.value, confidence: null };
              error = "";
            }}
          >
            <option value="">{$t.unknownTile}</option>
            {#each choices as choice}<option value={choice}>{choice}</option>{/each}
          </select>
          {#if detection.confidence !== null}<small>{Math.round(detection.confidence * 100)}%</small>{/if}
          <button type="button" class="btn btn-secondary" aria-label="{$t.removeDetectedTile} {index + 1}"
            onclick={() => { detections = detections.filter((_, i) => i !== index); error = ""; }}>×</button>
        </div>
      {/each}
    </div>
    <div class="photo-actions">
      <button type="button" class="btn btn-secondary" onclick={() => {
        detections = [...detections, { tile: "", confidence: null, box: null }];
        error = "";
      }}>{$t.addMissingTile}</button>
      <button type="button" class="btn btn-primary" onclick={apply}>{$t.applyScan}</button>
    </div>
  {/if}
</section>

<style>
  .scanner { margin: 1rem 0; padding: 1rem; border: 1px solid var(--border); background: var(--bg-elevated); }
  .scanner-heading, .photo-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
  .scanner-heading { justify-content: space-between; }
  .scanner p { margin: 0.5rem 0; color: var(--text-secondary); }
  .scanner .scan-error { color: var(--error); }
  label.btn { position: relative; cursor: pointer; min-height: 44px; }
  label input { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; }
  .preview { position: relative; width: fit-content; max-width: 100%; margin-top: 1rem; overflow: hidden; }
  .preview img { display: block; max-width: 100%; max-height: 55vh; width: auto; height: auto; }
  .detection-box { position: absolute; border: 2px solid #22c55e; pointer-events: none; }
  .detection-box span { position: absolute; top: 0; left: 0; background: #166534; color: white; font-size: 0.7rem; }
  .detected-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.5rem 0 1rem; }
  .detected-tile { display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem; border: 1px solid var(--border); }
  .detected-tile select { min-height: 44px; max-width: 9rem; color: var(--text-primary); background: var(--bg-surface); }
  .detected-tile .btn { min-width: 44px; min-height: 44px; }
</style>

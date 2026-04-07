<script>
  import ExerciseEditor from "./ExerciseEditor.svelte";

  let { exerciseId } = $props();

  let exercise = $state(null);
  let loaded = $state(false);

  $effect(() => {
    loaded = false;
    exercise = null;
    fetch(`/api/exercises/${exerciseId}`)
      .then(async (r) => {
        if (!r.ok) {
          return null;
        }
        return await r.json();
      })
      .then((data) => {
        exercise = data;
        loaded = true;
      });
  });
</script>

{#if loaded && exercise}
  <h1>{exercise.title}</h1>
  <p>{exercise.description}</p>
  {#key exercise.id}
    <ExerciseEditor exerciseId={exercise.id} />
  {/key}
{/if}

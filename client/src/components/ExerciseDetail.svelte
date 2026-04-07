<script>
  import ExerciseEditor from "./ExerciseEditor.svelte";
  import { useUserState } from "../states/userState.svelte.js";

  let { exerciseId } = $props();

  const userState = useUserState();

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
  {#if userState.loading}
    <p></p>
  {:else if userState.email}
    {#key exercise.id}
      <ExerciseEditor exerciseId={exercise.id} />
    {/key}
  {:else}
    <p>Login or register to complete exercises.</p>
  {/if}
{/if}

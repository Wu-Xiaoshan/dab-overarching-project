<script>
  let { languageId } = $props();

  let exercises = $state([]);
  let loaded = $state(false);

  $effect(() => {
    loaded = false;
    fetch(`/api/languages/${languageId}/exercises`)
      .then((r) => r.json())
      .then((data) => {
        exercises = data;
        loaded = true;
      });
  });
</script>

<h1>Available exercises</h1>
{#if loaded}
  <ul>
    {#each exercises as ex (ex.id)}
      <li><a href={`/exercises/${ex.id}`}>{ex.title}</a></li>
    {/each}
  </ul>
{/if}

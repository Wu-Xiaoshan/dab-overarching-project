<script>
  let languages = $state([]);
  let loaded = $state(false);

  $effect(() => {
    fetch("/api/languages")
      .then((r) => r.json())
      .then((data) => {
        languages = data;
        loaded = true;
      });
  });
</script>

<h1>Available languages</h1>
{#if loaded}
  <ul>
    {#each languages as lang (lang.id)}
      <li><a href={`/languages/${lang.id}`}>{lang.name}</a></li>
    {/each}
  </ul>
{/if}

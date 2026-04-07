<script>
  let { exerciseId } = $props();

  let text = $state("");
  let gradingStatus = $state(null);
  let grade = $state(null);
  let showGradingLines = $state(false);

  let pollTimer = null;

  const stopPolling = () => {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const applyStatusPayload = (data) => {
    gradingStatus = data.grading_status;
    grade = data.grade;
    showGradingLines = true;
    if (data.grading_status === "graded") {
      stopPolling();
    }
  };

  const pollOnce = async (submissionId) => {
    const r = await fetch(`/api/submissions/${submissionId}/status`);
    if (!r.ok) {
      return;
    }
    const data = await r.json();
    applyStatusPayload(data);
  };

  const startPolling = (submissionId) => {
    stopPolling();
    pollTimer = setInterval(() => {
      pollOnce(submissionId);
    }, 500);
    pollOnce(submissionId);
  };

  const handleSubmit = async () => {
    stopPolling();
    showGradingLines = false;
    gradingStatus = null;
    grade = null;

    const r = await fetch(`/api/exercises/${exerciseId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_code: text }),
    });

    if (!r.ok) {
      return;
    }

    const data = await r.json();
    startPolling(data.id);
  };

  $effect(() => {
    return () => {
      stopPolling();
    };
  });
</script>

<textarea bind:value={text}></textarea>
<button onclick={handleSubmit}>Submit</button>

{#if showGradingLines}
  <p>Grading status: {gradingStatus}</p>
  <p>Grade: {grade}</p>
{/if}

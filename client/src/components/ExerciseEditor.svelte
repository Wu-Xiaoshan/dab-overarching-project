<script>
  let { exerciseId } = $props();

  let text = $state("");
  let gradingStatus = $state(null);
  let grade = $state(null);
  let showGradingLines = $state(false);

  let lastPrediction = $state(null);

  let pollTimer = null;
  let predictDebounceTimer = null;

  const stopPolling = () => {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const clearPredictDebounce = () => {
    if (predictDebounceTimer !== null) {
      clearTimeout(predictDebounceTimer);
      predictDebounceTimer = null;
    }
  };

  const fetchPrediction = async () => {
    try {
      const r = await fetch("/inference-api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise: Number(exerciseId),
          code: text,
        }),
      });
      if (!r.ok) {
        return;
      }
      const data = await r.json();
      if (typeof data.prediction === "number") {
        lastPrediction = data.prediction;
      }
    } catch {
      // ignore network errors
    }
  };

  const schedulePredictionAfterIdle = () => {
    clearPredictDebounce();
    predictDebounceTimer = setTimeout(() => {
      predictDebounceTimer = null;
      fetchPrediction();
    }, 500);
  };

  const handleTextareaInput = () => {
    schedulePredictionAfterIdle();
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
    const r = await fetch(`/api/submissions/${submissionId}/status`, {
      credentials: "include",
    });
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
      credentials: "include",
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
      clearPredictDebounce();
    };
  });
</script>

<textarea bind:value={text} oninput={handleTextareaInput}></textarea>
<button onclick={handleSubmit}>Submit</button>

{#if lastPrediction !== null}
  <p>Correctness estimate: {Math.round(lastPrediction)}%</p>
{/if}

{#if showGradingLines}
  <p>Grading status: {gradingStatus}</p>
  <p>Grade: {grade}</p>
{/if}

#!/bin/sh
set -eu

docker exec teacher-exam-api-1 node -e 'fetch("http://127.0.0.1:3001/api/health/ai-live",{signal:AbortSignal.timeout(30000)}).then(async (response) => { const body = await response.text(); if (response.status !== 200 || !body.includes("gpt-6-luna")) { console.error(String(response.status)); console.error(body); process.exit(1); } console.log(body); }).catch((error) => { console.error(error); process.exit(1); })'

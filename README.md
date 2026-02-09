# Sea of Galilee (Kinneret) Water Level Bot 🌊

This project is an automated system that tracks the water level of the Sea of Galilee (Kinneret) in Israel. It fetches daily measurements from government data, maintains a history of records, tweets updates, and visualizes the data on a dashboard.

> 🤖 **Note:** This entire project—including code, tests, workflows, and documentation—was created by an **LLM Agent** (Opencode powered by Gemini 1.5 Pro).

## 🚀 Features

* **Daily Data Fetching**: Retrieves the latest water level measurements from the [Israeli Government Data API](https://data.gov.il/dataset/kineret-level).
* **Data Persistence**: Maintains a lightweight, append-only JSON database (`docs/surveys.json`) stored directly in the repository.
* **Twitter/X Bot**: Automatically tweets daily updates comparing the current level to the Upper Red Line (full lake capacity).
* **AI-Generated Tweets**: Optional integration with Google Gemini to generate natural, contextual Hebrew tweets with trend analysis and seasonal context (with fallback to template-based generation).
* **Visualization Dashboard**: A live interactive chart hosted on GitHub Pages viewing historical data.
* **CI/CD Automation**: Fully automated using GitHub Actions (no external server required).

## 📊 Dashboard

View the historical water level chart here:  
**[Live Dashboard](https://tzafrirben.github.io/sea-of-galilee-bot/)**

## 🛠️ Architecture

The project runs on **Node.js (TypeScript)** and utilizes **GitHub Actions** for scheduling.

1. **Update Job (`water-level.yml`)**: Runs daily at 14:00 UTC. Fetches new data, validates it using `AJV`, merges it with `docs/surveys.json`, and commits changes back to the repo.
2. **Tweet Job (`tweet-daily.yml`)**: Runs daily at 14:40 UTC. Checks if new data was added since the last tweet, formats a Hebrew message, and posts to Twitter via API v2.

## 📦 Installation & Local Development

### Prerequisites

* Node.js v24+
* Twitter Developer Account (for bot functionality)

### Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/tzafrirben/sea-of-galilee-bot.git
    cd sea-of-galilee-bot
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file for local testing (optional):

    ```env
    # Water level thresholds
    UPPER_RED_LINE=-208.80
    LOWER_RED_LINE=-213
    BLACK_LINE=-214.87

    # Twitter API credentials
    TWITTER_APP_KEY=your_key
    TWITTER_APP_SECRET=your_secret
    TWITTER_ACCESS_TOKEN=your_token
    TWITTER_ACCESS_SECRET=your_token_secret

    # LLM Configuration (optional - for AI-generated tweets)
    GEMINI_API_KEY=AIza...
    GEMINI_MODEL=gemini-2.0-flash
    USE_LLM_GENERATION=true
    MAX_TWEET_LENGTH=280

    # Testing
    DRY_RUN=true
    ```

    **Note:** If `USE_LLM_GENERATION=true`, tweets will be generated using Google Gemini AI for more natural, contextual messages. Gemini offers a generous free tier (15 requests/minute, 1M tokens/day) which is perfect for daily tweets. If `false` or if the API key is missing, the system falls back to the template-based format.

### Scripts

* `npm run build`: Compile TypeScript to JavaScript.
* `npm test`: Run unit tests.
* `npm run test:coverage`: Run tests with code coverage reports.
* `npm run update:surveys`: Fetch and update data locally.
* `npm run tweet:daily`: Attempt to generate and send a tweet (requires credentials).
* `npm run lint`: Check code quality with Biome.

## 🤖 AI Generation Process

This project serves as a demonstration of autonomous coding agents. The user provided high-level intent ("I want a bot that tweets Kinneret levels"), and the AI agent:

1. Scaffolded the TypeScript project.
2. Implemented business logic for data fetching and processing.
3. Wrote comprehensive unit tests using the Node.js native test runner.
4. Configured GitHub Actions pipelines.
5. Built the static HTML/JS dashboard.
6. Refactored code for testability and coverage.

## 📄 License

ISC

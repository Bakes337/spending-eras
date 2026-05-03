# The Spending Eras Project

Plaid gave its PMs production keys and a day to vibe code something. Not fully baked...but I had an LLM roast the last two years of my spending, era by era.


## What it does

Connects to your bank accounts via [Plaid's Transactions API](https://plaid.com/docs/transactions/), pulls two years of categorized spending data, asks an LLM to identify distinct eras in your financial life, then narrate them like a VH1 *Behind the Music* documentary that has read all your receipts and has opinions.

Each era gets:
- A **cinematic era name** — grand, neutral, slightly ominous
- A **narrator description** — one sentence; the name sounds noble, the sentence quietly eviscerates it
- The **top spending categories** that defined it
- A **therapy takeaway** — one honest observation about what this era says about you, delivered without mercy but with affection
- A **signature purchase** — one specific, telling transaction that could only belong to this chapter


## Example output

> **The Wandering** · Q3 2023
>
> *She needed to find herself. She looked in seven countries. She did not find receipts.*
>
> `Flights` `Hotels` `Experiences`
>
> **Therapy says:** Geography is not a coping mechanism. And yet.
>
> **Signature purchase:** A last-minute flight booked at 11pm on a Tuesday. One way.


## How it works

1. User connects their bank account via **Plaid Link**
2. Backend exchanges the public token for an access token and calls `/transactions/sync` to pull 24 months of categorized transactions
3. Spending is aggregated by category per month and sent to Claude with a system prompt that instructs it to identify eras, name them cinematically, and roast accordingly
4. Frontend renders the results as a vertical timeline, one era per entry


## Context

Built in one day for an internal Plaid PM hackathon. The prompt was open-ended — use our APIs, build something. This is what happened.

Not production-ready. Fully functional. Extremely honest about your finances.

<img width="1022" height="712" alt="Screenshot 2026-05-02 at 4 23 26 PM" src="https://github.com/user-attachments/assets/6c6d63dd-aa3e-40c1-9e03-3e70dfb6c9ad" />

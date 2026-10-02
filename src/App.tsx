import { readProgress, saveProgress } from "./runtime/progress";
import { CheckComparison } from "./components/CheckComparison";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  Code2,
  Database,
  FileText,
  Layers3,
  Lightbulb,
  LoaderCircle,
  Play,
  RotateCcw,
  Sprout,
  Table2,
  Terminal,
  X,
  XCircle,
} from "lucide-react";
import { exercises } from "./exercises";
import { getRuntime } from "./runtime/database";
import type { QueryResult, Schema, TestResult } from "./runtime/types";
import { SqlEditor } from "./components/SqlEditor";
import { DataTable } from "./components/DataTable";
const empty: QueryResult = { columns: [], rows: [] };
export default function App() {
  const [initial] = useState(() => readProgress(exercises.map((ex) => ex.id)));
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      exercises.findIndex((ex) => ex.id === initial.currentId),
    ),
  );
  const exercise = exercises[index];
  const [sql, setSql] = useState(
    initial.drafts[exercise.id] ?? exercise.starter,
  );
  const drafts = useRef<Record<string, string>>({ ...initial.drafts });
  const [completed, setCompleted] = useState<Set<string>>(
    new Set(initial.completed),
  );
  const [attempted, setAttempted] = useState<Set<string>>(
    new Set(initial.attempted),
  );
  const [schema, setSchema] = useState<Schema>({});
  const [result, setResult] = useState<QueryResult>(empty);
  const [checks, setChecks] = useState<TestResult[]>([]);
  const [busy, setBusy] = useState(true);
  const lock = useRef(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [ms, setMs] = useState<number>();
  const [output, setOutput] = useState<"results" | "checks" | "tables">(
    "results",
  );
  const [brief, setBrief] = useState<"instructions" | "source">("instructions");
  const [source, setSource] = useState(0);
  const [hint, setHint] = useState(0);
  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    setStorageAvailable(
      saveProgress({
        version: 1,
        drafts: drafts.current,
        completed: [...completed],
        attempted: [...attempted],
        currentId: exercise.id,
      }),
    );
  }, [sql, completed, attempted, exercise.id]);
  const [table, setTable] = useState("");
  const [tableData, setTableData] = useState<QueryResult>(empty);
  const [showGuide, setShowGuide] = useState(false);
  const [resetPrompt, setResetPrompt] = useState(false);
  useEffect(() => {
    if (!showGuide && !resetPrompt) return;
    const previous = document.activeElement as HTMLElement | null;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowGuide(false);
        setResetPrompt(false);
      }
      if (event.key === "Tab") {
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[role="dialog"] button, [role="dialog"] a[href]',
          ),
        );
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [showGuide, resetPrompt]);
  const passed = checks.length > 0 && checks.every((c) => c.passed);
  const passCount = checks.filter((c) => c.passed).length;
  async function load(next: number, reset = false) {
    lock.current = true;
    setBusy(true);
    setReady(false);
    setLoadError(false);
    setError("");
    setIndex(next);
    setChecks([]);
    setResult(empty);
    setSchema({});
    setTable("");
    setTableData(empty);
    setMs(undefined);
    setHint(0);
    setSolutionRevealed(false);
    setSource(0);
    setOutput("results");
    const target = exercises[next];
    setSql(
      reset ? target.starter : (drafts.current[target.id] ?? target.starter),
    );
    if (reset) {
      delete drafts.current[target.id];
      setAttempted((old) => {
        const next = new Set(old);
        next.delete(target.id);
        return next;
      });
      setCompleted((old) => {
        const copy = new Set(old);
        copy.delete(target.id);
        return copy;
      });
    }
    try {
      const runtime = await getRuntime();
      setSchema(await runtime.load(target));
      setReady(true);
    } catch (e) {
      setError(String(e));
      setLoadError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    void load(index);
  }, []);
  function changeSql(value: string) {
    setSql(value);
    drafts.current[exercise.id] = value;
  }
  async function run() {
    if (lock.current || !ready) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setChecks([]);
    setMs(undefined);
    setResult(empty);
    setAttempted((old) => new Set(old).add(exercise.id));
    try {
      const runtime = await getRuntime();
      const data = await runtime.run(sql, exercise);
      setResult(data.result);
      setChecks(data.tests);
      setSchema(data.schema);
      setMs(data.ms);
      setOutput("checks");
      if (table && data.schema[table])
        setTableData(await runtime.inspect(table));
      else {
        setTable("");
        setTableData(empty);
      }
      setCompleted((old) => {
        const next = new Set(old);
        if (data.tests.every((t) => t.passed)) next.add(exercise.id);

        return next;
      });
    } catch (e) {
      setError(String(e));
      setOutput("results");
      try {
        setSchema(await (await getRuntime()).schema());
      } catch {
        /* Display the original SQL error. */
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function inspect(name: string) {
    if (lock.current || !ready) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setTable(name);
    setTableData(empty);
    try {
      setTableData(await (await getRuntime()).inspect(name));
    } catch (e) {
      setError(String(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const stageIndex = { bronze: 1, silver: 2, gold: 3 }[exercise.stage];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="./" aria-label="DE-lings home">
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          <span>
            DE<span className="brand-dash">-</span>lings
            <span className="brand-dot">.</span>
          </span>
        </a>
        <div className="sidebar-intro">Small queries. Real skills.</div>
        <div className="path-label">
          YOUR LEARNING PATH <span>01</span>
        </div>
        <div className="path-title">From raw to ready</div>
        <p className="path-description">The data engineering essentials.</p>
        <div className="progress-meta">
          <span>
            {completed.size} of {exercises.length} completed
          </span>
          <span>{Math.round((completed.size / exercises.length) * 100)}%</span>
        </div>
        <div className="progress-track">
          <div
            style={{ width: `${(completed.size / exercises.length) * 100}%` }}
          />
        </div>
        <nav className="exercise-list" aria-label="Exercises">
          {exercises.map((ex, i) => (
            <button
              disabled={busy}
              key={ex.id}
              className={`exercise-link ${i === index ? "active" : ""}`}
              onClick={() => void load(i)}
              aria-current={i === index ? "step" : undefined}
            >
              <span
                className={`exercise-state ${completed.has(ex.id) ? "done" : ""}`}
              >
                {completed.has(ex.id) ? (
                  <CircleCheck size={19} />
                ) : attempted.has(ex.id) && i !== index ? (
                  <Circle size={19} className="attempted" />
                ) : (
                  <span>{String(i + 1).padStart(2, "0")}</span>
                )}
              </span>
              <span className="exercise-link-text">
                <strong>{ex.title}</strong>
                <small>
                  {ex.stage.charAt(0).toUpperCase() + ex.stage.slice(1)}{" "}
                  <span>·</span> {ex.minutes} min
                </small>
              </span>
              {i === index && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="learn-note">
          <span className="note-icon">
            <Sprout size={20} />
          </span>
          <strong>Learn by doing.</strong>
          <p>
            Write a little SQL. Run it.
            <br />
            Make it better. Repeat.
          </p>
        </div>
        <button className="sidebar-guide" onClick={() => setShowGuide(true)}>
          <BookOpen size={16} /> Field guide <ArrowUpRight size={14} />
        </button>
        {!storageAvailable && (
          <p className="storage-warning" role="status">
            Browser storage is unavailable. Your work will last only for this
            session.
          </p>
        )}
        <div className="sidebar-bottom">
          <span className="local-dot" /> No account. Just curiosity.
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="muted">Learning paths</span>
            <ChevronRight size={13} />
            <span>From raw to ready</span>
          </div>
          <span className="runtime-status">
            <span className={`local-dot ${!ready ? "pending" : ""}`} />
            {ready
              ? "DuckDB is ready"
              : busy
                ? "Starting DuckDB…"
                : "Database unavailable"}
            <span className="status-divider" />
            All local, all yours
          </span>
        </header>
        <main>
          <div className="heading-row">
            <div>
              <div className="eyebrow">
                EXERCISE {String(index + 1).padStart(3, "0")} <span>/</span>{" "}
                {String(exercises.length).padStart(3, "0")}
              </div>
              <h1>
                {exercise.title}
                <span>.</span>
              </h1>
              <p className="subtitle">{exercise.description}</p>
            </div>
            <div className="exercise-meta">
              <span>
                <Clock3 size={14} />
                {exercise.minutes} min
              </span>
              <span className="difficulty">
                <i />
                <i className={exercise.difficulty >= 2 ? "filled" : ""} />
                <i className={exercise.difficulty >= 3 ? "filled" : ""} />
                {
                  ["", "Beginner", "Intermediate", "A little stretch"][
                    exercise.difficulty
                  ]
                }
              </span>
            </div>
          </div>
          <div className="pipeline">
            <span className="pipeline-label">
              <Layers3 size={16} /> THE PIPELINE
            </span>
            <div className="pipeline-stages">
              {["Raw data", "Bronze", "Silver", "Gold"].map((stage, i) => (
                <div className="pipeline-part" key={stage}>
                  {i > 0 && <ArrowRight size={15} className="pipeline-arrow" />}
                  <span
                    className={`pipeline-step step-${i} ${stageIndex === i ? "current" : ""}`}
                  >
                    <span className="stage-dot" />
                    {stage}
                    {stageIndex === i && (
                      <span className="you-are-here">you are here</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <span className="pipeline-end">
              Better data, one layer at a time.
            </span>
          </div>
          <div className="workspace">
            <section className="brief-panel panel">
              <div
                className="panel-tabs"
                role="tablist"
                aria-label="Exercise details"
              >
                <button
                  role="tab"
                  aria-selected={brief === "instructions"}
                  className={brief === "instructions" ? "selected" : ""}
                  onClick={() => setBrief("instructions")}
                >
                  <BookOpen size={15} />
                  The brief
                </button>
                <button
                  role="tab"
                  aria-selected={brief === "source"}
                  className={brief === "source" ? "selected" : ""}
                  onClick={() => setBrief("source")}
                >
                  <FileText size={15} />
                  Raw data
                  <span className="tiny-badge">{exercise.fixtures.length}</span>
                </button>
              </div>
              {brief === "instructions" ? (
                <div className="brief-content">
                  <div className={`layer-tag ${exercise.stage}`}>
                    <span className="stage-dot" />
                    {exercise.stage.toUpperCase()} LAYER
                  </div>
                  <h2>Your mission</h2>
                  <p className="intro">{exercise.intro}</p>
                  <h3>Make it work</h3>
                  <ol className="objectives">
                    {exercise.objectives.map((item, i) => (
                      <li key={item}>
                        <span>{i + 1}</span>
                        <p>{item}</p>
                      </li>
                    ))}
                  </ol>
                  <div className="target-box">
                    <Database size={16} />
                    <div>
                      <span>YOUR OUTPUT TABLE</span>
                      <code>{exercise.target}</code>
                    </div>
                  </div>
                  <div className="topic-list">
                    {exercise.topics.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  <div className="hint-box">
                    <button
                      onClick={() => setHint(hint ? 0 : 1)}
                      aria-expanded={hint > 0}
                    >
                      <Lightbulb size={17} />
                      <span>A nudge in the right direction</span>
                      <ChevronDown size={14} className={hint ? "rotate" : ""} />
                    </button>
                    {hint > 0 && (
                      <div className="hint-content">
                        {exercise.hints.slice(0, hint).map((h, i) => (
                          <p key={h}>
                            <strong>Hint {i + 1}.</strong> {h}
                          </p>
                        ))}
                        {hint < exercise.hints.length && (
                          <button
                            className="text-button"
                            onClick={() => setHint(hint + 1)}
                          >
                            One more hint <ArrowRight size={12} />
                          </button>
                        )}
                        {hint >= exercise.hints.length && (
                          <div className="solution-reveal">
                            <button
                              className="text-button"
                              onClick={() =>
                                setSolutionRevealed(!solutionRevealed)
                              }
                              aria-expanded={solutionRevealed}
                            >
                              {solutionRevealed
                                ? "Hide solution"
                                : "Reveal solution"}{" "}
                              <Code2 size={14} />
                            </button>
                            {solutionRevealed && (
                              <div className="solution-content">
                                <p>
                                  {exercise.solutionExplanation ??
                                    "One way to satisfy the exercise. Copy it to the editor, explore it, and run the checks."}
                                </p>
                                <pre aria-label="Reference solution">
                                  <code>{exercise.solution}</code>
                                </pre>
                                <button
                                  className="run-button"
                                  disabled={busy}
                                  onClick={() => changeSql(exercise.solution)}
                                >
                                  Copy to editor
                                </button>
                                <p className="solution-note">
                                  Replaces your draft. Run &amp; check to
                                  complete the exercise.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="brief-content">
                  <div className="source-header">
                    <span className="eyebrow">SOURCE FIXTURES</span>
                    <span className="tiny-badge">Read only</span>
                  </div>
                  <p className="intro">
                    Exactly as it arrived. Whitespace, duplicates, and all.
                  </p>
                  <div className="fixture-tabs">
                    {exercise.fixtures.map((f, i) => (
                      <button
                        key={f.file}
                        className={source === i ? "selected" : ""}
                        onClick={() => setSource(i)}
                      >
                        <FileText size={14} />
                        {f.file}
                      </button>
                    ))}
                  </div>
                  <pre className="raw-source">
                    {exercise.inputs[exercise.fixtures[source].file]}
                  </pre>
                  <p className="source-note">
                    {exercise.fixtures[source].table ? (
                      <>
                        Already loaded into{" "}
                        <code>{exercise.fixtures[source].table}</code> with raw
                        text columns.
                      </>
                    ) : (
                      <>
                        Available to SQL as{" "}
                        <code>'{exercise.fixtures[source].file}'</code>. Your
                        query creates the Bronze table.
                      </>
                    )}
                  </p>
                </div>
              )}
            </section>
            <div className="workbench">
              <section className="editor-panel panel">
                <div className="editor-header">
                  <div className="editor-file">
                    <Code2 size={16} />
                    <span>workspace.sql</span>
                    <span
                      className="unsaved-dot"
                      title={
                        storageAvailable
                          ? "Draft saved in this browser"
                          : "Draft available only in this session"
                      }
                    />
                  </div>
                  <button
                    className="icon-button reset-button"
                    disabled={busy}
                    onClick={() => setResetPrompt(true)}
                    title="Reset SQL and database"
                    aria-label="Reset exercise"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
                <SqlEditor
                  value={sql}
                  onChange={changeSql}
                  onRun={() => void run()}
                  schema={schema}
                  disabled={busy}
                />
                <div className="editor-footer">
                  <span>
                    <span className="local-dot" />
                    DuckDB SQL <span className="footer-dot">·</span>
                    <span className="autocomplete-label">
                      Schema-aware autocomplete
                    </span>
                  </span>
                  <button
                    className="run-button"
                    disabled={busy || !ready || !sql.trim()}
                    onClick={() => void run()}
                  >
                    {busy ? (
                      <LoaderCircle size={14} className="spin" />
                    ) : (
                      <Play size={13} fill="currentColor" />
                    )}
                    {busy ? "Working…" : "Run & check"}
                    <kbd>⌘ / Ctrl ↵</kbd>
                  </button>
                </div>
              </section>
              <section className="output-panel panel">
                <div className="output-header">
                  <div
                    className="panel-tabs"
                    role="tablist"
                    aria-label="SQL output"
                  >
                    <button
                      role="tab"
                      aria-selected={output === "results"}
                      className={output === "results" ? "selected" : ""}
                      onClick={() => setOutput("results")}
                    >
                      <Table2 size={15} />
                      Results
                    </button>
                    <button
                      role="tab"
                      aria-selected={output === "checks"}
                      className={output === "checks" ? "selected" : ""}
                      onClick={() => setOutput("checks")}
                    >
                      <CheckCheck size={16} />
                      Checks{" "}
                      <span
                        className={`tiny-badge ${passed ? "badge-green" : ""}`}
                      >
                        {checks.length
                          ? `${passCount}/${checks.length}`
                          : exercise.tests.length}
                      </span>
                    </button>
                    <button
                      role="tab"
                      aria-selected={output === "tables"}
                      className={output === "tables" ? "selected" : ""}
                      onClick={() => setOutput("tables")}
                    >
                      <Database size={14} />
                      Tables
                      <span className="tiny-badge">
                        {Object.keys(schema).length}
                      </span>
                    </button>
                  </div>
                  {ms !== undefined && <span className="elapsed">{ms} ms</span>}
                </div>
                {error && (
                  <div className="error-message" role="alert">
                    <XCircle size={18} />
                    <div>
                      <strong>
                        {loadError
                          ? "Could not start the exercise"
                          : "Let’s fix that query"}
                      </strong>
                      <pre>{error}</pre>
                      {loadError && (
                        <button
                          className="text-button"
                          onClick={() => void load(index)}
                        >
                          Retry loading
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {output === "results" &&
                  (result.columns.length ? (
                    <>
                      <div className="result-info">
                        <span className="local-dot" /> Query executed{" "}
                        <span>
                          {result.rows.length}{" "}
                          {result.rows.length === 1 ? "row" : "rows"}
                        </span>
                      </div>
                      <DataTable data={result} />
                    </>
                  ) : (
                    !error && (
                      <div className="empty-state">
                        <div className="empty-icon">
                          <Terminal size={25} />
                        </div>
                        <h3>A little SQL goes a long way.</h3>
                        <p>
                          Run your query to see the results here.
                          <br />
                          We’ll check your work along the way.
                        </p>
                        <span className="empty-shortcut">
                          <kbd>⌘ / Ctrl</kbd> + <kbd>Enter</kbd> to run
                        </span>
                      </div>
                    )
                  ))}
                {output === "checks" && (
                  <div className="checks-body">
                    {checks.length ? (
                      <>
                        <div
                          role="status"
                          className={`checks-summary ${passed ? "success" : ""}`}
                        >
                          <span>
                            {passed ? (
                              <CircleCheck size={19} />
                            ) : (
                              <Lightbulb size={19} />
                            )}
                            <strong>
                              {passed
                                ? "Nicely done. Every check passed."
                                : `${passCount} of ${checks.length} checks passed. Keep going.`}
                            </strong>
                          </span>
                          {passed && completed.size === exercises.length && (
                            <span className="path-complete">
                              Path complete!
                            </span>
                          )}
                        </div>
                        {passed && index < exercises.length - 1 && (
                          <section
                            className="next-exercise-callout"
                            aria-label="Exercise complete"
                          >
                            <div>
                              <span className="eyebrow">
                                UP NEXT · {String(index + 2).padStart(3, "0")}
                              </span>
                              <strong>{exercises[index + 1].title}</strong>
                            </div>
                            <button
                              className="run-button"
                              onClick={() => void load(index + 1)}
                              disabled={busy}
                            >
                              Next exercise <ArrowRight size={18} />
                            </button>
                          </section>
                        )}
                        <div className="check-list">
                          {checks.map((c, i) => (
                            <details
                              key={i}
                              className={`check-item ${c.passed ? "pass" : "fail"}`}
                              open={!c.passed}
                            >
                              <summary>
                                {c.passed ? (
                                  <CircleCheck size={17} />
                                ) : (
                                  <XCircle size={17} />
                                )}
                                <span>{c.label}</span>
                                <ChevronDown size={13} />
                              </summary>
                              <div className="check-detail">
                                {c.detail && (
                                  <p>
                                    <strong>{c.detail}</strong>
                                  </p>
                                )}
                                <p>{c.why}</p>
                                {c.error ? (
                                  <pre>{c.error}</pre>
                                ) : (
                                  <CheckComparison
                                    check={exercise.tests[i]}
                                    result={c}
                                  />
                                )}
                              </div>
                            </details>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="empty-state">
                        <CheckCheck size={28} />
                        <h3>Fast feedback, built in.</h3>
                        <p>
                          Run your SQL to check {exercise.tests.length}{" "}
                          expectations against your data.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {output === "tables" && (
                  <div className="tables-body">
                    <div className="table-picker">
                      {Object.entries(schema).map(([name, cols]) => (
                        <button
                          key={name}
                          className={table === name ? "selected" : ""}
                          disabled={busy}
                          onClick={() => void inspect(name)}
                        >
                          <Database size={14} />
                          <span>{name}</span>
                          <small>{cols.length} columns</small>
                        </button>
                      ))}
                      {!Object.keys(schema).length && (
                        <p>No tables yet. Run your SQL to create one.</p>
                      )}
                    </div>
                    {table && (
                      <>
                        <div className="schema-chips">
                          {schema[table]?.map((c) => (
                            <span key={c.name}>
                              {c.name} <small>{c.type}</small>
                            </span>
                          ))}
                        </div>
                        <DataTable data={tableData} />
                        <p className="table-limit">Showing up to 100 rows</p>
                      </>
                    )}
                    {!table && Object.keys(schema).length > 0 && (
                      <p className="table-prompt">
                        <ArrowUpRight size={16} /> Pick a table to explore its
                        schema and rows.
                      </p>
                    )}
                  </div>
                )}
              </section>
              <div className="workspace-caption">
                <span>
                  <Braces size={14} /> Real SQL. Real data. A tiny sandbox.
                </span>
                <span>Nothing leaves your browser.</span>
              </div>
            </div>
          </div>
          <footer className="page-footer">
            <span>
              Built for the{" "}
              <span className="footer-serif">“let me try it”</span> kind of
              learner.
            </span>
            <span>
              {String(index + 1).padStart(2, "0")}{" "}
              <span className="muted">
                / {String(exercises.length).padStart(2, "0")}
              </span>
              <button
                aria-label="Previous exercise"
                disabled={index === 0 || busy}
                onClick={() => void load(index - 1)}
              >
                <ArrowRight size={16} className="flip" />
              </button>
              <button
                aria-label="Next exercise"
                disabled={index === exercises.length - 1 || busy}
                onClick={() => void load(index + 1)}
              >
                <ArrowRight size={16} />
              </button>
            </span>
          </footer>
        </main>
      </div>
      {resetPrompt && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <button
              autoFocus
              className="modal-close icon-button"
              onClick={() => setResetPrompt(false)}
              aria-label="Close reset dialog"
            >
              <X size={18} />
            </button>
            <RotateCcw size={26} />
            <h2 id="reset-title">A fresh start?</h2>
            <p>
              Reset this exercise’s saved SQL, completion, tables, and checks to
              the starter. Your other exercises stay as they are.
            </p>
            <div className="modal-actions">
              <button onClick={() => setResetPrompt(false)}>
                Keep working
              </button>
              <button
                className="run-button"
                onClick={() => {
                  setResetPrompt(false);
                  void load(index, true);
                }}
              >
                Reset exercise
              </button>
            </div>
          </section>
        </div>
      )}
      {showGuide && (
        <div className="modal-backdrop">
          <section
            className="modal guide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
          >
            <button
              autoFocus
              className="modal-close icon-button"
              onClick={() => setShowGuide(false)}
              aria-label="Close field guide"
            >
              <X size={18} />
            </button>
            <BookOpen size={26} />
            <div className="eyebrow">THE DE-LINGS FIELD GUIDE</div>
            <h2 id="guide-title">From raw to ready.</h2>
            <p>
              Five small exercises. One real SQL engine. Start anywhere,
              experiment freely, and use the checks to find your next step.
            </p>
            <div className="guide-layer">
              <span className="layer-tag bronze">BRONZE</span>
              <p>Keep a faithful copy of what arrived. Preserve raw values.</p>
            </div>
            <ArrowDown size={16} />
            <div className="guide-layer">
              <span className="layer-tag silver">SILVER</span>
              <p>Clean, type, deduplicate, and keep trustworthy history.</p>
            </div>
            <ArrowDown size={16} />
            <div className="guide-layer">
              <span className="layer-tag gold">GOLD</span>
              <p>Shape dependable data into business answers.</p>
            </div>
            <div className="guide-tip">
              <strong>Your progress is saved in this browser.</strong> Drafts
              and completed exercises survive a refresh. Switching exercises
              rebuilds the data; run your saved SQL to recreate its tables.
              Reset clears that exercise’s saved progress. Browser data clearing
              removes all saved progress. Run with ⌘/Ctrl + Enter; autocomplete
              with Ctrl + Space.
            </div>
            <a
              href="https://duckdb.org/docs/stable/sql/introduction"
              target="_blank"
              rel="noreferrer"
            >
              DuckDB SQL reference <ArrowUpRight size={14} />
            </a>
          </section>
        </div>
      )}
    </div>
  );
}

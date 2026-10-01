import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorState, Compartment, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import type { Schema } from "../runtime/types";
export function SqlEditor({
  value,
  onChange,
  onRun,
  schema,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  schema: Schema;
  disabled: boolean;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const language = useRef(new Compartment());
  const editable = useRef(new Compartment());
  const callbacks = useRef({ onChange, onRun });
  callbacks.current = { onChange, onRun };
  useEffect(() => {
    const editor = new EditorView({
      parent: parent.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          language.current.of(sql({ dialect: PostgreSQL })),
          editable.current.of(EditorView.editable.of(!disabled)),
          Prec.highest(
            keymap.of([
              {
                key: "Mod-Enter",
                run: () => {
                  callbacks.current.onRun();
                  return true;
                },
              },
            ]),
          ),
          EditorView.updateListener.of((u) => {
            if (u.docChanged)
              callbacks.current.onChange(u.state.doc.toString());
          }),
          EditorView.contentAttributes.of({
            "aria-label": "SQL editor",
            "data-testid": "sql-editor",
            spellcheck: "false",
          }),
          EditorView.theme({
            "&": { height: "100%", fontSize: "13px", background: "#fdfdfb" },
            ".cm-scroller": {
              fontFamily:
                '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
              lineHeight: "1.85",
              overflow: "auto",
            },
            ".cm-content": { padding: "18px 0" },
            ".cm-gutters": {
              background: "#fdfdfb",
              color: "#a1a59d",
              border: "none",
              paddingRight: "14px",
            },
            ".cm-lineNumbers .cm-gutterElement": { paddingLeft: "18px" },
            ".cm-activeLine, .cm-activeLineGutter": { background: "#f0f3eb" },
            "&.cm-focused": { outline: "none" },
            ".cm-selectionBackground": { background: "#dce9df !important" },
            ".cm-cursor": { borderLeftColor: "#17684d" },
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    const editor = view.current;
    if (editor && value !== editor.state.doc.toString())
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      });
  }, [value]);
  useEffect(() => {
    view.current?.dispatch({
      effects: language.current.reconfigure(
        sql({
          dialect: PostgreSQL,
          schema: Object.fromEntries(
            Object.entries(schema).map(([table, columns]) => [
              table,
              columns.map((c) => c.name),
            ]),
          ),
        }),
      ),
    });
  }, [schema]);
  useEffect(() => {
    view.current?.dispatch({
      effects: editable.current.reconfigure(EditorView.editable.of(!disabled)),
    });
  }, [disabled]);
  return <div className="sql-editor" ref={parent} />;
}

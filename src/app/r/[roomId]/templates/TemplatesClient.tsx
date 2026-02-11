"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";

type Template = { id: string; name: string; count: number; createdAt: string };

function ymdTodayJst() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TemplatesClient({ roomId }: { roomId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [dateFrom, setDateFrom] = useState(ymdTodayJst());
  const [tplName, setTplName] = useState("");
  const [applyDate, setApplyDate] = useState(ymdTodayJst());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const data = await api<{ templates: Template[] }>(`/api/r/${roomId}/templates`);
    setTemplates(data.templates);
  }

  useEffect(() => {
    load().catch((e) => setErr(String(e?.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveTemplate() {
    const name = tplName.trim();
    if (!name) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/r/${roomId}/templates`, {
        method: "POST",
        json: { name, date: dateFrom },
      });
      setTplName("");
      await load();
      alert("テンプレ保存しました");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function applyTemplate(id: string) {
    if (!confirm(`${applyDate} に適用しますか？`)) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/r/${roomId}/templates/${id}/apply?date=${applyDate}`, { method: "POST" });
      alert("適用しました");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md p-4 space-y-4">
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">テンプレ</h1>
            <a className="text-sm underline" href={`/r/${roomId}`}>
              戻る
            </a>
          </div>
          <div className="text-xs text-gray-600 break-all">Room: {roomId}</div>
        </header>

        <div className="rounded-xl bg-white p-4 shadow space-y-3">
          <div className="font-semibold">テンプレ保存（オーナーのみ）</div>

          <label className="block text-sm">
            保存元の日付
            <input
              type="date"
              className="mt-1 w-full rounded-lg border p-2"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            テンプレ名
            <input
              className="mt-1 w-full rounded-lg border p-2"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="例: 平日用"
            />
          </label>

          <button
            className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-50"
            onClick={saveTemplate}
            disabled={busy || !tplName.trim()}
          >
            保存
          </button>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}
        </div>

        <div className="rounded-xl bg-white p-4 shadow space-y-3">
          <div className="font-semibold">適用先の日付</div>
          <input
            type="date"
            className="w-full rounded-lg border p-2"
            value={applyDate}
            onChange={(e) => setApplyDate(e.target.value)}
          />
        </div>

        <div className="rounded-xl bg-white shadow">
          <div className="p-3 border-b font-semibold">テンプレ一覧</div>
          {templates.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">まだありません</div>
          ) : (
            <ul className="divide-y">
              {templates.map((t) => (
                <li key={t.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      {t.count} 件 / {new Date(t.createdAt).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-400 break-all">{t.id}</div>
                  </div>
                  <button
                    className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                    onClick={() => applyTemplate(t.id)}
                    disabled={busy}
                  >
                    適用
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
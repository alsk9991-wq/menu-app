"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client/api";
import {
  getDeviceId,
  getDisplayName,
  setDeviceId,
  setDisplayName,
} from "@/lib/client/device";
import { useRouter } from "next/navigation";
import { ensureDeviceId } from "@/lib/client/device";


type Item = {
  id: string;
  name: string;
  addedBy: string;
  orderIndex: number;
  canEdit: boolean;
};

type DailyGet = {
  date: string;
  items: Item[];
  isOwner: boolean;
};

function ymdTodayJst() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function MenuClient({ roomId }: { roomId: string }) {
  const router = useRouter();

  const [date, setDate] = useState<string>(ymdTodayJst());
  const [items, setItems] = useState<Item[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const [name, setName] = useState("");
  const [displayName, setDn] = useState("");
  const [deviceId, setDid] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const canUseApp = useMemo(() => displayName.trim().length > 0, [displayName]);

    const copyInviteLink = useCallback(async () => {
    const token = (process.env.NEXT_PUBLIC_FIXED_INVITE_TOKEN ?? "").trim();
    if (!token) {
      alert("NEXT_PUBLIC_FIXED_INVITE_TOKEN が未設定です");
      return;
    }
    const url = `${location.origin}/join/${roomId}?token=${encodeURIComponent(
      token
    )}`;
    await navigator.clipboard.writeText(url);
    alert("招待リンクをコピーしました");
  }, [roomId]);

  async function load() {
    setErr("");
    const data = await api<DailyGet>(`/api/r/${roomId}/daily?date=${date}`);
    setItems(data.items);
    setIsOwner(data.isOwner);
  }

  useEffect(() => {
    setDn(getDisplayName());
    setDid(getDeviceId());
  }, []);

  useEffect(() => {
    if (!canUseApp) return;
    load().catch((e) => setErr(String(e?.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, canUseApp]);

  async function addItem() {
    const v = name.trim();
    if (!v) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/r/${roomId}/daily?date=${date}`, {
        method: "POST",
        json: { name: v },
      });
      setName("");
      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function move(itemId: string, direction: "up" | "down") {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/r/${roomId}/items/${itemId}/move`, {
        method: "POST",
        json: { direction },
      });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function edit(itemId: string, current: string) {
    const v = prompt("メニュー名を変更", current);
    if (v === null) return;
    const nv = v.trim();
    if (!nv) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/r/${roomId}/items/${itemId}`, {
        method: "PATCH",
        json: { name: nv },
      });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function del(itemId: string) {
    if (!confirm("削除しますか？")) return;

    setBusy(true);
    setErr("");
    try {
      await api(`/api/r/${roomId}/items/${itemId}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }


function saveProfile() {
  const dn = displayName.trim();
  if (!dn) return;

  setDisplayName(dn);

  const did = deviceId.trim() || ensureDeviceId(); // 空なら自動生成
  setDid(did);        // state更新
  setDeviceId(did);   // localStorage更新

  alert("保存しました");
  router.refresh();
  load().catch(() => {});
}

  return (
    <div className="min-h-dvh bg-gray-50">
      <div className="mx-auto max-w-md p-4 space-y-4">
        <header className="space-y-2">
          <div className="text-xs text-gray-600 break-all">Room: {roomId}</div>
                        <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  あなた: <span className="font-semibold">{displayName}</span>
                  {isOwner ? (
                    <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs">
                      Owner
                    </span>
                  ) : null}
                </div>

                {isOwner ? (
                  <button
                    className="text-sm underline"
                    onClick={copyInviteLink}
                    disabled={busy}
                  >
                    招待リンクをコピー
                  </button>
                ) : null}
              </div>

        </header>

        {!canUseApp ? (
          <div className="rounded-xl bg-white p-4 shadow space-y-3">
            <div className="font-semibold">最初に設定</div>

            <label className="block text-sm">
              ニックネーム
              <input
                className="mt-1 w-full rounded-lg border p-2"
                value={displayName}
                onChange={(e) => setDn(e.target.value)}
                placeholder="例: ken"
              />
            </label>

            <label className="block text-sm">
              端末ID（開発用：dev-1 など固定可能）
              <input
                className="mt-1 w-full rounded-lg border p-2 font-mono text-xs"
                value={deviceId}
                onChange={(e) => setDid(e.target.value)}
              />
              <div className="mt-1 text-xs text-gray-500">
                オーナー端末にしたい場合は <span className="font-mono">dev-1</span>{" "}
                を入れて保存
              </div>
            </label>

            <button
              className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-50"
              onClick={saveProfile}
              disabled={!displayName.trim()}
            >
              保存して開始
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-white p-4 shadow space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  あなた: <span className="font-semibold">{displayName}</span>
                  {isOwner ? (
                    <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs">
                      Owner
                    </span>
                  ) : null}
                </div>
              </div>

              <label className="block text-sm">
                日付
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border p-2"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border p-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="メニューを追加"
                />
                <button
                  className="rounded-lg bg-black text-white px-4 disabled:opacity-50"
                  onClick={addItem}
                  disabled={busy || !name.trim()}
                >
                  追加
                </button>
              </div>

              {err ? <div className="text-sm text-red-600">{err}</div> : null}
            </div>

            <div className="rounded-xl bg-white shadow">
              <div className="p-3 border-b font-semibold">一覧</div>
              {items.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">まだありません</div>
              ) : (
                <ul className="divide-y">
            {items.map((it, idx) => (
  <li key={it.id} className="p-3 flex items-center gap-3">
    {/* 左：名前 + 追加者 */}
    <div className="flex-1 min-w-0">
      <div className="font-medium break-words">
        {it.name}
        <span className="ml-2 text-xs text-gray-400">({it.addedBy})</span>
      </div>
    </div>

    {/* 右：ボタンを横一列 */}
    <div className="flex items-center gap-2 shrink-0">
      <button
        className="rounded border px-2 py-1 text-sm disabled:opacity-50"
        onClick={() => move(it.id, "up")}
        disabled={busy || idx === 0}
      >
        ↑
      </button>

      <button
        className="rounded border px-2 py-1 text-sm disabled:opacity-50"
        onClick={() => move(it.id, "down")}
        disabled={busy || idx === items.length - 1}
      >
        ↓
      </button>

      <button
        className="rounded border px-2 py-1 text-sm disabled:opacity-50"
        onClick={() => edit(it.id, it.name)}
        disabled={busy || !it.canEdit}
      >
        編
      </button>

      <button
        className="rounded border px-2 py-1 text-sm text-red-600 disabled:opacity-50"
        onClick={() => del(it.id)}
        disabled={busy || !it.canEdit}
      >
        削
      </button>
    </div>
  </li>
))}


                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

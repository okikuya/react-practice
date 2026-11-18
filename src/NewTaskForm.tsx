import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// 今日の日付を YYYY-MM-DD で。<input type="date"> と同じ形なので、
// 文字列のまま比較できる（"2026-11-18" >= "2026-11-17"）。
const today = () => new Date().toLocaleDateString("sv-SE");

// ルールをここに1か所だけ書く。画面もサーバーに送る形も、ここから決まる。
//
// title の必須と maxLength は HTML の required / maxlength でも書ける。
// due_on の「今日より前はだめ」は HTML だけでは書けない（min は書けるが、
// 「今日」を毎回入れ直す必要があり、日付が変わると古いままになる）。
// ここが zod を使う理由。
export const newTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(50, "タイトルは50文字以内で入力してください"),
  description: z
    .string()
    .trim()
    .max(200, "説明は200文字以内で入力してください"),
  due_on: z
    .string()
    .refine((v) => v === "" || v >= today(), "今日より前の日付は選べません"),
});

export type NewTask = z.infer<typeof newTaskSchema>;

type Props = {
  onSubmit: (values: NewTask) => void;
  // CSRF トークン待ち、または送信中
  disabled: boolean;
  pending: boolean;
};

const field =
  "w-full rounded border border-slate-300 px-3 py-2 " +
  "focus:border-slate-500 focus:outline-none disabled:bg-slate-100";
const label = "block text-sm font-medium text-slate-700";
const errorText = "mt-1 text-sm text-red-700";

function NewTaskForm({ onSubmit, disabled, pending }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewTask>({
    resolver: zodResolver(newTaskSchema),
    // 既定は「送信してから」。一度でも間違えた項目は、打つたびに出し直す。
    // 最初から onChange にすると、1文字目で「入力してください」が出て邪魔になる。
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { title: "", description: "", due_on: "" },
  });

  const submit = handleSubmit((values) => {
    onSubmit(values);
    reset();
  });

  const busy = disabled || pending || isSubmitting;

  return (
    <form onSubmit={submit} className="mb-6 space-y-3" noValidate>
      <div>
        <label className={label} htmlFor="title">
          タイトル
        </label>
        <input
          id="title"
          className={field}
          placeholder="タスクを入力"
          disabled={busy}
          // aria-invalid があると、読み上げも自動テストもエラーを拾える
          aria-invalid={errors.title ? true : undefined}
          {...register("title")}
        />
        {errors.title && <p className={errorText}>{errors.title.message}</p>}
      </div>

      <div>
        <label className={label} htmlFor="description">
          説明（任意）
        </label>
        <textarea
          id="description"
          rows={2}
          className={field}
          disabled={busy}
          aria-invalid={errors.description ? true : undefined}
          {...register("description")}
        />
        {errors.description && (
          <p className={errorText}>{errors.description.message}</p>
        )}
      </div>

      <div>
        <label className={label} htmlFor="due_on">
          期限（任意）
        </label>
        <input
          id="due_on"
          type="date"
          className={field}
          disabled={busy}
          aria-invalid={errors.due_on ? true : undefined}
          {...register("due_on")}
        />
        {errors.due_on && <p className={errorText}>{errors.due_on.message}</p>}
      </div>

      <button
        type="submit"
        disabled={busy}
        className={
          "rounded bg-slate-800 px-4 py-2 text-white " +
          "hover:bg-slate-700 disabled:bg-slate-400"
        }
      >
        {pending ? "追加中…" : disabled ? "準備中…" : "追加"}
      </button>
    </form>
  );
}

export default NewTaskForm;

import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { readUiPreference, restoreColumnWidths, writeUiPreference } from "./ui-preferences";

export const useColumnWidths = <T extends object>(table: string, defaults: T): [T, Dispatch<SetStateAction<T>>] => {
  const name = `columns:${table}`;
  const [widths, setWidths] = useState<T>(() => restoreColumnWidths(defaults, readUiPreference(name)));
  const update = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    setWidths((previous) => {
      const next = typeof action === "function" ? (action as (value: T) => T)(previous) : action;
      writeUiPreference(name, next);
      return next;
    });
  }, [name]);
  return [widths, update];
};

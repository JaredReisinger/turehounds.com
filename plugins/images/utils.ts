// type helper for Array.filter
export function exists<T>(value: T | undefined | null | false | ''): value is T {
  return !!value;
}

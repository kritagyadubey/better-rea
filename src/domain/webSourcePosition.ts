/** JavaScript positions use one-based lines and zero-based UTF-16 columns. */
export interface WebSourcePosition {
  readonly line: number;
  readonly column: number;
}

/**
 * A selected coordinate the retained text cannot supply, with the inclusive
 * bounds the caller can pick from. `minimum` is fixed by the coordinate's
 * definition; `maximum` describes the retained text.
 */
export type WebSourcePositionRejection =
  | {
      readonly coordinate: "line";
      readonly minimum: 1;
      readonly maximum: number;
    }
  | {
      readonly coordinate: "column";
      readonly minimum: 0;
      readonly maximum: number;
    };

/** One resolved offset, an out-of-range coordinate with bounds, or a malformed coordinate. */
export type WebSourcePositionOutcome =
  | { readonly kind: "resolved"; readonly offset: number }
  | ({ readonly kind: "out_of_range" } & WebSourcePositionRejection)
  | { readonly kind: "invalid" };

/**
 * Resolve a selected position against actual text without splitting the whole
 * source. This is the single owner of line-terminator and column semantics:
 * `webSourceOffset` and the request-error projection both read its result, so a
 * rejected position reports the same bounds that made it invalid.
 */
export const webSourcePositionOutcome = (
  text: string,
  position: WebSourcePosition,
): WebSourcePositionOutcome => {
  if (
    !Number.isSafeInteger(position.line) ||
    position.line < 1 ||
    !Number.isSafeInteger(position.column) ||
    position.column < 0
  )
    return { kind: "invalid" };
  let line = 1;
  let start = 0;
  for (const boundary of text.matchAll(/\r\n?|\n|\u2028|\u2029/gu)) {
    if (line === position.line)
      return position.column <= boundary.index - start
        ? { kind: "resolved", offset: start + position.column }
        : {
            kind: "out_of_range",
            coordinate: "column",
            minimum: 0,
            maximum: boundary.index - start,
          };
    line += 1;
    start = boundary.index + boundary[0].length;
  }
  // The loop only stops early once `position.line` is reached, so an unvisited
  // position here is past the final line.
  if (line !== position.line)
    return {
      kind: "out_of_range",
      coordinate: "line",
      minimum: 1,
      maximum: line,
    };
  const lineLength = text.length - start;
  return position.column <= lineLength
    ? { kind: "resolved", offset: start + position.column }
    : {
        kind: "out_of_range",
        coordinate: "column",
        minimum: 0,
        maximum: lineLength,
      };
};

/** Verify a selected position against actual text. */
export const webSourceOffset = (
  text: string,
  position: WebSourcePosition,
): number | undefined => {
  const outcome = webSourcePositionOutcome(text, position);
  return outcome.kind === "resolved" ? outcome.offset : undefined;
};

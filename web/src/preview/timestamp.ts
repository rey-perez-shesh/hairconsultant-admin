/** Minimal stand-in for firebase/firestore's Timestamp. valueOf() makes them sortable. */
export class Timestamp {
  constructor(
    readonly seconds: number,
    readonly nanoseconds: number,
  ) {}

  static now() {
    return Timestamp.fromMillis(Date.now());
  }

  static fromMillis(millis: number) {
    return new Timestamp(Math.floor(millis / 1000), (millis % 1000) * 1_000_000);
  }

  static fromDate(date: Date) {
    return Timestamp.fromMillis(date.getTime());
  }

  toMillis() {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000);
  }

  toDate() {
    return new Date(this.toMillis());
  }

  valueOf() {
    return this.toMillis();
  }
}

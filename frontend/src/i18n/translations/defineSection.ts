export function defineSection<const T extends Record<string, string>>(section: {
  en: T;
  ru: { [K in keyof T]: string };
}) {
  return section;
}

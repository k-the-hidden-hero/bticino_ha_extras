/**
 * The one version both cards print and report. It has to match package.json,
 * and the build refuses to run when it does not, so a release cannot ship two
 * cards that disagree about what they are.
 */
export const VERSION = '2026.10.0';

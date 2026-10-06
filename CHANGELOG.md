# Changelog

## [0.18.1](https://github.com/TundraSoft/ui/compare/v0.18.0...v0.18.1) (2026-10-06)


### Bug Fixes

* **alert:** a ::before-icon theme can line up a wrapped aside on a phone ([#55](https://github.com/TundraSoft/ui/issues/55)) ([b699a07](https://github.com/TundraSoft/ui/commit/b699a0728c144d4def3dcfc0e7121a8437567404))
* **deps:** source-map-js 1.2.2 (GHSA-68fv-2mgg-jv7q) ([#57](https://github.com/TundraSoft/ui/issues/57)) ([e89bed5](https://github.com/TundraSoft/ui/commit/e89bed5215e7fa7f6b56b76ca4f1008aa32f9389))

## [0.18.0](https://github.com/TundraSoft/ui/compare/v0.17.0...v0.18.0) (2026-10-05)


### Features

* **deps:** require rAPId ^0.12.0 ([#53](https://github.com/TundraSoft/ui/issues/53)) ([df099d3](https://github.com/TundraSoft/ui/commit/df099d385e7bc27c82cd472b34e1bb22bb0c8234))


### Bug Fixes

* **alert:** on a phone a long message stays beside the icon when the aside wraps ([#52](https://github.com/TundraSoft/ui/issues/52)) ([fd9bd52](https://github.com/TundraSoft/ui/commit/fd9bd52a9ba647cea3ed673bb8dab9253bcd0e5e))

## [0.17.0](https://github.com/TundraSoft/ui/compare/v0.16.0...v0.17.0) (2026-10-05)


### Features

* **deps:** require rAPId ^0.11.0 ([#51](https://github.com/TundraSoft/ui/issues/51)) ([959c4d8](https://github.com/TundraSoft/ui/commit/959c4d8af51960a1b7164e6b53f094370853ff12))


### Bug Fixes

* inline components render without surrounding whitespace; Alert aside wraps on phones ([#49](https://github.com/TundraSoft/ui/issues/49)) ([e31496f](https://github.com/TundraSoft/ui/commit/e31496faa56a16936cc40abd02d0cf43568dfb0f))

## [0.16.0](https://github.com/TundraSoft/ui/compare/v0.15.0...v0.16.0) (2026-10-05)


### Features

* styles for rAPId composed parts; Alert aside, bodyAttrs, textTag ([#47](https://github.com/TundraSoft/ui/issues/47)) ([22a0932](https://github.com/TundraSoft/ui/commit/22a093265aaea7cbca53e7b1b5272e58635282ad))

## [0.15.0](https://github.com/TundraSoft/ui/compare/v0.14.0...v0.15.0) (2026-10-05)


### Features

* **deps:** require rAPId ^0.10.0 ([#45](https://github.com/TundraSoft/ui/issues/45)) ([7adb2c2](https://github.com/TundraSoft/ui/commit/7adb2c2c7b6a47c57f7f7a1bc908d89fedbc881e))

## [0.14.0](https://github.com/TundraSoft/ui/compare/v0.13.0...v0.14.0) (2026-10-05)


### Features

* **deps:** require rAPId ^0.9.0 ([#42](https://github.com/TundraSoft/ui/issues/42)) ([b947b84](https://github.com/TundraSoft/ui/commit/b947b8402b6227f3d65f051282e97b2e5c925a01))
* TabLinks listAttrs, small console props; fix: SidebarLayout 992–1199px, Alert role, class merging ([#41](https://github.com/TundraSoft/ui/issues/41)) ([d047ec5](https://github.com/TundraSoft/ui/commit/d047ec520a8cb030554076211b5f3237b8ebd392))
* **templates:** a route's layoutData reaches the frame; PageCrumbs ([#44](https://github.com/TundraSoft/ui/issues/44)) ([d3af40b](https://github.com/TundraSoft/ui/commit/d3af40b82f1f2e0b09743733fb123c2c50171892))

## [0.13.0](https://github.com/TundraSoft/ui/compare/v0.12.0...v0.13.0) (2026-10-04)


### Features

* mergeAttrs everywhere, and the console's follow-up asks ([#39](https://github.com/TundraSoft/ui/issues/39)) ([b26e8fb](https://github.com/TundraSoft/ui/commit/b26e8fb64ffb552f7e7046cf66b461df4cf7208d))

## [0.12.0](https://github.com/TundraSoft/ui/compare/v0.11.0...v0.12.0) (2026-10-04)


### ⚠ BREAKING CHANGES

* Select's visible control is a `<button role="combobox">` (its label in `[data-select-text]`), not a read-only `<input>` — a read-only text input blocked a form's implicit submission. Read its `textContent`, not `.value`. A server-rendered `data-theme` on `<html>` now wins over the choice stored in the browser.

### Features

* the pieces the Brevily console had to build itself ([#37](https://github.com/TundraSoft/ui/issues/37)) ([01e4818](https://github.com/TundraSoft/ui/commit/01e48181e10f2ac9ba8ab28c0b4fc6062c2ec31d))

## [0.11.0](https://github.com/TundraSoft/ui/compare/v0.10.1...v0.11.0) (2026-10-01)


### Features

* **deps:** require rAPId ^0.8.4 ([#35](https://github.com/TundraSoft/ui/issues/35)) ([8c9e226](https://github.com/TundraSoft/ui/commit/8c9e2261d9e0d7c6375fdb7c98faa2fd5af28142))


### Bug Fixes

* **select:** clicking the field or its label toggles the list ([#34](https://github.com/TundraSoft/ui/issues/34)) ([88aadcd](https://github.com/TundraSoft/ui/commit/88aadcd2dc314ea667388ca8d34aa4ae5d072bf0))

## [0.10.1](https://github.com/TundraSoft/ui/compare/v0.10.0...v0.10.1) (2026-10-01)


### Bug Fixes

* **datepicker:** without JS, a client-mode date is a native date field ([#32](https://github.com/TundraSoft/ui/issues/32)) ([a633453](https://github.com/TundraSoft/ui/commit/a63345383311550dc7b7620b29d1b0bf2f25f93b))

## [0.10.0](https://github.com/TundraSoft/ui/compare/v0.9.0...v0.10.0) (2026-09-30)


### Features

* TimePicker and DateTimePicker; the select tick follows a pick ([#30](https://github.com/TundraSoft/ui/issues/30)) ([8b08973](https://github.com/TundraSoft/ui/commit/8b0897300ade7c30311d2d2df7457e661de9562c))


### Bug Fixes

* **modal:** an open select list, date or time panel is no longer clipped by the dialog ([8b08973](https://github.com/TundraSoft/ui/commit/8b0897300ade7c30311d2d2df7457e661de9562c))
* **select:** the tick stayed on the server-rendered option after a pick ([8b08973](https://github.com/TundraSoft/ui/commit/8b0897300ade7c30311d2d2df7457e661de9562c))

## [0.9.0](https://github.com/TundraSoft/ui/compare/v0.8.0...v0.9.0) (2026-09-27)


### Features

* **deps:** require rAPId ^0.8.3 ([#28](https://github.com/TundraSoft/ui/issues/28)) ([d3d3882](https://github.com/TundraSoft/ui/commit/d3d38822952840bf7fda84eef15b21f14db8ce47))

## [0.8.0](https://github.com/TundraSoft/ui/compare/v0.7.0...v0.8.0) (2026-09-22)


### ⚠ BREAKING CHANGES

* **forms:** composite inputs, CardFields, async validation, flags hook ([#27](https://github.com/TundraSoft/ui/issues/27))
* **input:** `@tundralibs/ui/password` / `PasswordInput` are removed — use `Input({ type: "password", ... })` with the same props.

### Features

* **deps:** require rAPId ^0.8.0 ([#24](https://github.com/TundraSoft/ui/issues/24)) ([0915a8f](https://github.com/TundraSoft/ui/commit/0915a8fa78c89769b7ae656bde88c58217abb8d4))
* **forms:** composite inputs, CardFields, async validation, flags hook ([#27](https://github.com/TundraSoft/ui/issues/27)) ([2ba8808](https://github.com/TundraSoft/ui/commit/2ba8808eb69da2d8871c1c6eacebcddecfb68e4a))
* **input:** type="password" renders the password field; the separate PasswordInput is folded in ([#26](https://github.com/TundraSoft/ui/issues/26)) ([488a6b4](https://github.com/TundraSoft/ui/commit/488a6b4c9229f321a7020412876ea5225f7f4bdd))

## [0.7.0](https://github.com/TundraSoft/ui/compare/v0.6.0...v0.7.0) (2026-09-22)


### Features

* **deps:** require rAPId ^0.7.1 ([#20](https://github.com/TundraSoft/ui/issues/20)) ([6ee50fb](https://github.com/TundraSoft/ui/commit/6ee50fb0f0e66380631317df25fedc7332baaaf6))
* **forms:** client-side validation, PasswordInput with strength bar and confirm matching ([#22](https://github.com/TundraSoft/ui/issues/22)) ([4b075a1](https://github.com/TundraSoft/ui/commit/4b075a1547b630c7062a70882497031c4a5d9a14))

## [0.6.0](https://github.com/TundraSoft/ui/compare/v0.5.0...v0.6.0) (2026-09-19)


### Features

* **deps:** require rAPId ^0.7.0 ([#18](https://github.com/TundraSoft/ui/issues/18)) ([28fd367](https://github.com/TundraSoft/ui/commit/28fd3677129f2cd042b26b0e41d7acc35cf372e4))

## [0.5.0](https://github.com/TundraSoft/ui/compare/v0.4.0...v0.5.0) (2026-09-19)


### Features

* **deps:** require rAPId ^0.6.0 ([#16](https://github.com/TundraSoft/ui/issues/16)) ([01b5120](https://github.com/TundraSoft/ui/commit/01b51208493abea426799084ae2f3cc48074e7cb))

## [0.4.0](https://github.com/TundraSoft/ui/compare/v0.3.0...v0.4.0) (2026-09-18)


### Features

* **deps:** require rAPId ^0.5.0 ([#14](https://github.com/TundraSoft/ui/issues/14)) ([f10773d](https://github.com/TundraSoft/ui/commit/f10773d09578f329850a9e49efd0c798297b429d))

## [0.3.0](https://github.com/TundraSoft/ui/compare/v0.2.0...v0.3.0) (2026-09-18)


### Features

* **deps:** require rAPId ^0.4.0 ([#9](https://github.com/TundraSoft/ui/issues/9)) ([5f32a84](https://github.com/TundraSoft/ui/commit/5f32a8428515977abb73aaaa2c3a788bf912340f))

## [0.2.0](https://github.com/TundraSoft/ui/compare/v0.1.2...v0.2.0) (2026-09-18)


### Features

* data-table bulk forms and row strips, upload progress, recipes docs ([#7](https://github.com/TundraSoft/ui/issues/7)) ([35a97e8](https://github.com/TundraSoft/ui/commit/35a97e83e463ba98ec08e5709beea9b5aeb96a30))

## [0.1.2](https://github.com/TundraSoft/ui/compare/v0.1.1...v0.1.2) (2026-09-17)


### Documentation

* keep the CDN examples pinned to the current release ([d33b8c0](https://github.com/TundraSoft/ui/commit/d33b8c0d1ed73ffe0573213c70d5e64d97c32d00))

## [0.1.1](https://github.com/TundraSoft/ui/compare/v0.1.0...v0.1.1) (2026-09-17)


### Performance

* ship minified ui.css and ui.js ([f6bd4a6](https://github.com/TundraSoft/ui/commit/f6bd4a6448f6dc27b15d01f9dc93fa3bdac9d0c9))

## 0.1.0 (2026-09-17)


### Features

* initial release ([199faa0](https://github.com/TundraSoft/ui/commit/199faa0463703570bb37e137b86e09147e67cf5e))

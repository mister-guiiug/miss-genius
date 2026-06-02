// Config partagée miss-* / mister-* (flat config, React 19, react-hooks,
// react-refresh, override e2e). On ignore le dossier `worker/` (proxy Pronote)
// qui a son propre runtime (Cloudflare Workers) et sa propre toolchain.
import base from '@mister-guiiug/dev-wpa-config/eslint-react';

export default [...base, { ignores: ['worker/**', 'dist/**'] }];

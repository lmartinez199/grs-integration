import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist/", "src-tauri/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Convención del proyecto (docs/onboarding-dev.md §5): inputs de texto
      // van por el primitivo ui/input. Checkbox/radio/file crudos son legítimos
      // porque no tienen primitivo.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name='input']:not(:has(JSXAttribute[name.name='type']))",
          message:
            "Usa <Input> de @/components/ui/input en vez de <input> crudo.",
        },
        {
          selector:
            "JSXOpeningElement[name.name='input']:has(JSXAttribute[name.name='type'] Literal[value=/^(text|search|number|password|email|url|tel)$/])",
          message:
            "Usa <Input> de @/components/ui/input en vez de <input> crudo.",
        },
      ],
    },
  },
  {
    // El primitivo sí usa el elemento nativo.
    files: ["src/components/ui/**"],
    rules: { "no-restricted-syntax": "off" },
  },
);

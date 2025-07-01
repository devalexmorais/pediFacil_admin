# Guia de Build - Admin pedifacil

## 🚀 Como fazer o build

```bash
npm run build
```

## 📦 Arquivo gerado

O instalador será criado em: `release/0.0.0/Admin pedifacil-Windows-0.0.0-Setup.exe`

## 🔧 Variáveis de Ambiente Necessárias

Crie um arquivo `.env` na raiz do projeto com:

```env
VITE_FIREBASE_API_KEY=sua-api-key-aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcd1234
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 🔍 Solucionando Tela Branca

Se a aplicação buildada apresentar tela branca:

1. **Verifique as variáveis de ambiente** - Certifique-se de que o arquivo `.env` existe e está correto
2. **Console de erro** - Abra o DevTools (F12) na aplicação e verifique erros no console
3. **Arquivo de log** - Verifique os logs do Electron no console do terminal

## 🛠️ Problemas Comuns

- **Tela branca**: Geralmente causada por variáveis de ambiente do Firebase faltantes
- **Ícone não aparece**: Verifique se o arquivo `public/logo.png` existe
- **Falha no carregamento**: Problemas com caminhos de arquivos - verificar console

## 📁 Estrutura de Build

```
release/
└── 0.0.0/
    ├── Admin pedifacil-Windows-0.0.0-Setup.exe  (Instalador)
    ├── win-unpacked/                             (Aplicação descompactada)
    └── builder-effective-config.yaml             (Configuração usada)
```

## 🔄 Para testar antes de distribuir

Execute o aplicativo descompactado em:
`release/0.0.0/win-unpacked/Admin pedifacil.exe` 
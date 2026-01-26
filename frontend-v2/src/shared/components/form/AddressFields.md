# AddressFields Component

Componente reutilizável para campos de morada com auto-preenchimento através de código postal (API CTT).

## Features

✅ Auto-preenchimento de código postal
✅ Seleção automática quando há apenas 1 rua
✅ Dropdown com múltiplas ruas quando disponível
✅ Modo manual para entrada personalizada
✅ Auto-preenchimento de campos administrativos (nut1-4)
✅ Feedback visual (loading, success)
✅ Validação integrada
✅ Totalmente personalizável

---

## Props

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `formData` | `Object` | **Required** | Objeto com dados do formulário (postal, address, door, floor, nut1-4) |
| `onChange` | `Function` | **Required** | Callback: `(field: string, value: string) => void` |
| `disabled` | `boolean` | `false` | Se campos estão desabilitados |
| `required` | `boolean` | `false` | Se campos são obrigatórios |
| `showNotifications` | `boolean` | `true` | Se deve mostrar notificações toast |
| `gridSizes` | `Object` | Ver abaixo | Tamanhos personalizados das colunas Grid |

### Grid Sizes (padrão)

```javascript
{
  postal: { xs: 12, sm: 3 },   // Código Postal
  address: { xs: 12, sm: 5 },  // Morada
  door: { xs: 12, sm: 2 },     // Porta
  floor: { xs: 12, sm: 2 },    // Andar
  nut4: { xs: 12, sm: 3 },     // Localidade
  nut3: { xs: 12, sm: 3 },     // Freguesia
  nut2: { xs: 12, sm: 3 },     // Concelho
  nut1: { xs: 12, sm: 3 },     // Distrito
}
```

---

## Exemplo 1: Uso Básico

```jsx
import { useState } from 'react';
import { AddressFields } from '@/shared/components/form';

function MyForm() {
  const [formData, setFormData] = useState({
    postal: '',
    address: '',
    door: '',
    floor: '',
    nut1: '',
    nut2: '',
    nut3: '',
    nut4: '',
  });

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <AddressFields
      formData={formData}
      onChange={handleAddressChange}
      disabled={false}
      required={true}
    />
  );
}
```

---

## Exemplo 2: Integração em Formulário de Edição

```jsx
import { useState } from 'react';
import { Box, Button, Paper } from '@mui/material';
import { AddressFields } from '@/shared/components/form';

function EntityEditForm({ entity }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: entity.name,
    postal: entity.postal || '',
    address: entity.address || '',
    door: entity.door || '',
    floor: entity.floor || '',
    nut1: entity.nut1 || '',
    nut2: entity.nut2 || '',
    nut3: entity.nut3 || '',
    nut4: entity.nut4 || '',
  });

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Guardar dados...
    await saveEntity(formData);
    setIsEditing(false);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Nome"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          disabled={!isEditing}
        />
      </Box>

      <AddressFields
        formData={formData}
        onChange={handleFieldChange}
        disabled={!isEditing}
        required={true}
      />

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        {isEditing ? (
          <>
            <Button onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSave}>Guardar</Button>
          </>
        ) : (
          <Button variant="contained" onClick={() => setIsEditing(true)}>
            Editar
          </Button>
        )}
      </Box>
    </Paper>
  );
}
```

---

## Exemplo 3: Grid Sizes Personalizados

```jsx
import { AddressFields } from '@/shared/components/form';

function CompactAddressForm() {
  const [formData, setFormData] = useState({...});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Layout compacto: 1 linha para postal+morada, 1 linha para nuts
  const customGridSizes = {
    postal: { xs: 12, sm: 4 },
    address: { xs: 12, sm: 8 },
    door: { xs: 6, sm: 3 },
    floor: { xs: 6, sm: 3 },
    nut4: { xs: 6, sm: 3 },
    nut3: { xs: 6, sm: 3 },
    nut2: { xs: 6, sm: 3 },
    nut1: { xs: 6, sm: 3 },
  };

  return (
    <AddressFields
      formData={formData}
      onChange={handleChange}
      gridSizes={customGridSizes}
    />
  );
}
```

---

## Exemplo 4: Sem Notificações Toast

```jsx
import { AddressFields } from '@/shared/components/form';

function SilentAddressForm() {
  const [formData, setFormData] = useState({...});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AddressFields
      formData={formData}
      onChange={handleChange}
      showNotifications={false} // Desativa notificações
    />
  );
}
```

---

## Exemplo 5: Formulário de Documento com Múltiplas Moradas

```jsx
import { useState } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { AddressFields } from '@/shared/components/form';

function DocumentForm() {
  const [billingAddress, setBillingAddress] = useState({
    postal: '', address: '', door: '', floor: '',
    nut1: '', nut2: '', nut3: '', nut4: '',
  });

  const [shippingAddress, setShippingAddress] = useState({
    postal: '', address: '', door: '', floor: '',
    nut1: '', nut2: '', nut3: '', nut4: '',
  });

  const handleBillingChange = (field, value) => {
    setBillingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleShippingChange = (field, value) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Morada de Faturação
      </Typography>
      <AddressFields
        formData={billingAddress}
        onChange={handleBillingChange}
        required={true}
      />

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" gutterBottom>
        Morada de Envio
      </Typography>
      <AddressFields
        formData={shippingAddress}
        onChange={handleShippingChange}
        required={false}
      />
    </Box>
  );
}
```

---

## Como Funciona

### 1. Código Postal (Auto-preenchimento)

Quando o utilizador digita um código postal:

1. **Formatação automática**: `3430030` → `3430-030`
2. **Quando completo (8 chars)**: Faz chamada à API CTT
3. **API retorna dados**: Ruas + dados administrativos (distrito, concelho, freguesia, localidade)

### 2. Seleção de Rua

**Caso 1: Apenas 1 rua encontrada**
- Campo de morada é **pré-selecionado automaticamente**
- Utilizador pode alterar se quiser (opção "Outra" disponível)

**Caso 2: Múltiplas ruas encontradas**
- Campo fica vazio
- Helper text mostra: "X resultados encontrados"
- Utilizador abre dropdown e seleciona da lista
- Opção "Outra" disponível para entrada manual

**Caso 3: Nenhuma rua encontrada**
- Ativa modo manual automaticamente
- Utilizador insere morada manualmente
- Helper text: "Modo manual - insira a morada"

### 3. Campos Administrativos (NUT1-4)

- **Auto-preenchidos** quando código postal é encontrado
- **Desabilitados** para evitar alterações (dados vêm da API oficial)
- Helper text "Auto-preenchido" quando em modo de edição
- **Podem ser editados** se código postal não for encontrado (modo manual)

### 4. Limpeza Automática

Quando o utilizador **remove dígitos** do código postal:
- Limpa automaticamente: `address`, `nut1`, `nut2`, `nut3`, `nut4`
- Prepara campos para receber novos dados
- Evita dados inconsistentes

---

## Estrutura de Dados

```typescript
interface AddressData {
  postal: string;    // Código postal (XXXX-XXX)
  address: string;   // Morada/Rua
  door: string;      // Porta
  floor: string;     // Andar
  nut1: string;      // Distrito
  nut2: string;      // Concelho
  nut3: string;      // Freguesia
  nut4: string;      // Localidade
}
```

---

## Validação

Para validar os campos, usa o prop `required`:

```jsx
<AddressFields
  formData={formData}
  onChange={handleChange}
  required={true} // Campos obrigatórios
/>
```

Campos marcados como obrigatórios (quando `required={true}`):
- ✅ Código Postal
- ✅ Morada

Campos opcionais:
- Porta
- Andar
- Localidade, Freguesia, Concelho, Distrito (obrigatórios só se não forem auto-preenchidos)

---

## Dependências

Este componente depende de:

- `@/core/hooks/usePostalCode` - Hook customizado
- `@/services/postalCodeService` - Serviço API CTT
- `@mui/material` - Material-UI components
- `@mui/icons-material` - Ícones

---

## API CTT

O componente usa a API pública dos CTT (Correios de Portugal):

**Endpoint**: `https://www.cttcodigopostal.pt/api/v1/[API_KEY]/{postalCode}`

**Resposta**:
```json
[
  {
    "morada": "Rua Example",
    "localidade": "Lisboa",
    "freguesia": "Santa Maria Maior",
    "concelho": "Lisboa",
    "distrito": "Lisboa"
  }
]
```

A API key está configurada em `.env`:
```
VITE_CTT_API_KEY=8a21fc4e22fc480994321a46f6bddc6b
```

---

## Troubleshooting

### Código postal não encontrado
- Verifica se o código está correto
- Confirma que a API CTT está acessível
- Verifica a API key no `.env`

### Campos não atualizam
- Verifica se o callback `onChange` está a atualizar o estado corretamente
- Confirma que `formData` tem todos os campos necessários

### Helper texts não aparecem
- Verifica se o prop `disabled` está correto
- Confirma que estás em modo de edição

---

## Notas

- 🇵🇹 **Apenas para códigos postais portugueses**
- 🔄 **Debouncing de 500ms** para evitar chamadas excessivas à API
- 🔔 **Notificações configuráveis** via prop `showNotifications`
- 📱 **Totalmente responsivo** com Grid system do MUI
- ♿ **Acessível** com labels e helper texts

---

## Changelog

**v1.0.0** - 2025-01-06
- Versão inicial do componente
- Auto-preenchimento via API CTT
- Seleção automática de rua única
- Modo manual com fallback
- Feedback visual completo

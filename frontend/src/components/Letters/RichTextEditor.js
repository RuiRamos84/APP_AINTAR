import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Box,
  Paper,
  IconButton,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Code,
  Undo,
  Redo,
  InsertDriveFile
} from '@mui/icons-material';
import './RichTextEditor.css';

// Variáveis disponíveis para inserir nos templates
const AVAILABLE_VARIABLES = [
  { category: 'Destinatário', variables: [
    { name: 'NOME', label: 'Nome do Destinatário' },
    { name: 'MORADA', label: 'Morada' },
    { name: 'PORTA', label: 'Porta/Número' },
    { name: 'CODIGO_POSTAL', label: 'Código Postal' },
    { name: 'LOCALIDADE', label: 'Localidade' },
    { name: 'NIF', label: 'NIF' },
  ]},
  { category: 'Pedido', variables: [
    { name: 'NUMERO_PEDIDO', label: 'Número do Pedido' },
    { name: 'DATA_PEDIDO', label: 'Data do Pedido' },
    { name: 'MORADA_PEDIDO', label: 'Morada do Pedido' },
    { name: 'PORTA_PEDIDO', label: 'Porta do Pedido' },
    { name: 'FREGUESIA_PEDIDO', label: 'Freguesia do Pedido' },
    { name: 'POSTAL_CODE_PEDIDO', label: 'Código Postal do Pedido' },
    { name: 'LOCALIDADE_PEDIDO', label: 'Localidade do Pedido' },
  ]},
  { category: 'Sistema', variables: [
    { name: 'DATA', label: 'Data Atual' },
    { name: 'NUMERO_OFICIO', label: 'Número do Ofício' },
    { name: 'ASSUNTO', label: 'Assunto do Ofício' },
  ]},
];

const RichTextEditor = ({ content, onChange, placeholder = 'Escreva o conteúdo do ofício...' }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      // Retorna HTML para compatibilidade com o backend
      onChange(editor.getHTML());
    },
  });

  const handleVariableMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleVariableMenuClose = () => {
    setAnchorEl(null);
  };

  const insertVariable = (variableName) => {
    if (editor) {
      // Inserir variável no formato Jinja2: {{ VARIAVEL }}
      editor.chain().focus().insertContent(`{{ ${variableName} }}`).run();
    }
    handleVariableMenuClose();
  };

  if (!editor) {
    return null;
  }

  return (
    <Paper elevation={1} sx={{ border: '1px solid #ddd' }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          p: 1,
          borderBottom: '1px solid #ddd',
          bgcolor: '#f5f5f5'
        }}
      >
        {/* Text Formatting */}
        <Tooltip title="Negrito">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBold().run()}
            color={editor.isActive('bold') ? 'primary' : 'default'}
          >
            <FormatBold />
          </IconButton>
        </Tooltip>

        <Tooltip title="Itálico">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            color={editor.isActive('italic') ? 'primary' : 'default'}
          >
            <FormatItalic />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Lists */}
        <Tooltip title="Lista com marcadores">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            color={editor.isActive('bulletList') ? 'primary' : 'default'}
          >
            <FormatListBulleted />
          </IconButton>
        </Tooltip>

        <Tooltip title="Lista numerada">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            color={editor.isActive('orderedList') ? 'primary' : 'default'}
          >
            <FormatListNumbered />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Undo/Redo */}
        <Tooltip title="Desfazer">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo />
          </IconButton>
        </Tooltip>

        <Tooltip title="Refazer">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Insert Variable */}
        <Tooltip title="Inserir Variável">
          <IconButton
            size="small"
            onClick={handleVariableMenuOpen}
            color="primary"
          >
            <InsertDriveFile />
          </IconButton>
        </Tooltip>

        {/* Variable Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleVariableMenuClose}
          PaperProps={{
            style: { maxHeight: 400, width: '350px' }
          }}
        >
          {AVAILABLE_VARIABLES.map((category) => [
            <MenuItem key={category.category} disabled>
              <Typography variant="subtitle2" color="primary" fontWeight="bold">
                {category.category}
              </Typography>
            </MenuItem>,
            ...category.variables.map((variable) => (
              <MenuItem
                key={variable.name}
                onClick={() => insertVariable(variable.name)}
                sx={{ pl: 3 }}
              >
                <ListItemText
                  primary={variable.label}
                  secondary={
                    <Chip
                      label={`{{ ${variable.name} }}`}
                      size="small"
                      sx={{ fontSize: '0.7rem', height: '20px' }}
                    />
                  }
                />
              </MenuItem>
            ))
          ])}
        </Menu>
      </Box>

      {/* Editor Content */}
      <Box sx={{ p: 2, minHeight: '300px' }}>
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
};

export default RichTextEditor;

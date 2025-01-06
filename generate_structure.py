import os


def generate_structure(start_path, file_output, ignore_dirs):
    def tree(dir_path, prefix=''):
        contents = list(os.listdir(dir_path))
        pointers = [os.path.join(dir_path, d) for d in contents]
        for i, path in enumerate(pointers):
            if os.path.basename(path) in ignore_dirs:
                continue
            is_last = i == (len(pointers) - 1)
            yield prefix + ('└── ' if is_last else '├── ') + os.path.basename(path)
            if os.path.isdir(path):
                extension = '    ' if is_last else '│   '
                yield from tree(path, prefix + extension)
    
    with open(file_output, 'w', encoding='utf-8') as file:
        for line in tree(start_path):
            file.write(line + '\n')


if __name__ == "__main__":
    ignore_dirs = ['node_modules', 'public', '__pycache__', 'venv', '.git']
    directories = [('backend', 'structure_backend.txt'), ('frontend', 'structure_frontend.txt')]
    
    for start_path, output_file in directories:
        generate_structure(start_path, output_file, ignore_dirs)

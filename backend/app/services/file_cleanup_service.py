"""
File Cleanup Service - Gestão automática de ficheiros temporários
Remove ficheiros antigos e organiza armazenamento de ofícios
"""

import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict
import logging
from flask import current_app

logger = logging.getLogger(__name__)


class FileCleanupService:
    """Serviço de limpeza e organização de ficheiros"""

    @staticmethod
    def cleanup_temp_files(days_old: int = 7, dry_run: bool = False) -> Dict:
        """
        Remove ficheiros temporários com mais de X dias

        Args:
            days_old: Número de dias para considerar ficheiro antigo
            dry_run: Se True, apenas lista ficheiros sem remover

        Returns:
            dict com estatísticas: {
                'scanned': 150,
                'removed': 12,
                'freed_mb': 45.2,
                'files': ['file1.pdf', 'file2.pdf']
            }
        """
        temp_dir = current_app.config.get('TEMP_DIR', 'temp')

        if not os.path.exists(temp_dir):
            logger.warning(f"Diretório temp não existe: {temp_dir}")
            return {
                'scanned': 0,
                'removed': 0,
                'freed_mb': 0,
                'files': []
            }

        cutoff_date = datetime.now() - timedelta(days=days_old)
        files_removed = []
        total_size = 0
        scanned = 0

        try:
            for filename in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, filename)

                # Apenas ficheiros (não diretórios)
                if not os.path.isfile(file_path):
                    continue

                scanned += 1

                # Verificar data de modificação
                file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))

                if file_mtime < cutoff_date:
                    file_size = os.path.getsize(file_path)

                    if not dry_run:
                        try:
                            os.remove(file_path)
                            files_removed.append(filename)
                            total_size += file_size
                            logger.info(f"Removed old temp file: {filename}")
                        except Exception as e:
                            logger.error(f"Error removing {filename}: {str(e)}")
                    else:
                        files_removed.append(filename)
                        total_size += file_size

            freed_mb = total_size / (1024 * 1024)  # Converter para MB

            logger.info(
                f"Cleanup completed: {len(files_removed)} files removed, "
                f"{freed_mb:.2f} MB freed"
            )

            return {
                'scanned': scanned,
                'removed': len(files_removed),
                'freed_mb': round(freed_mb, 2),
                'files': files_removed
            }

        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            raise

    @staticmethod
    def organize_letters_by_date(source_dir: str = None) -> Dict:
        """
        Organiza ofícios em pastas por ano/mês

        Estrutura criada:
        files/letters/
        ├── 2025/
        │   ├── 01/
        │   │   ├── OF-2025.S.OFI.000001.pdf
        │   │   └── OF-2025.S.OFI.000002.pdf
        │   └── 02/
        └── 2024/
            └── 12/

        Args:
            source_dir: Diretório fonte (default: files/letters/)

        Returns:
            dict com estatísticas
        """
        if source_dir is None:
            source_dir = os.path.join(
                current_app.config['FILES_DIR'],
                'letters'
            )

        if not os.path.exists(source_dir):
            logger.warning(f"Diretório não existe: {source_dir}")
            return {
                'organized': 0,
                'errors': 0
            }

        organized_count = 0
        error_count = 0

        try:
            for filename in os.listdir(source_dir):
                file_path = os.path.join(source_dir, filename)

                # Apenas ficheiros PDF
                if not (os.path.isfile(file_path) and filename.endswith('.pdf')):
                    continue

                # Extrair ano do nome do ficheiro (OF-2025.S.OFI.000001.pdf)
                try:
                    parts = filename.split('-')[1].split('.')
                    year = parts[0][:4]  # Primeiros 4 dígitos do ano

                    # Obter mês da data de modificação
                    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                    month = f"{file_mtime.month:02d}"

                    # Criar estrutura de pastas
                    dest_dir = os.path.join(source_dir, year, month)
                    os.makedirs(dest_dir, exist_ok=True)

                    # Mover ficheiro
                    dest_path = os.path.join(dest_dir, filename)

                    if not os.path.exists(dest_path):
                        shutil.move(file_path, dest_path)
                        organized_count += 1
                        logger.info(f"Organized: {filename} -> {year}/{month}/")
                    else:
                        logger.warning(f"File already exists: {dest_path}")

                except Exception as e:
                    logger.error(f"Error organizing {filename}: {str(e)}")
                    error_count += 1

            logger.info(f"Organization completed: {organized_count} files organized")

            return {
                'organized': organized_count,
                'errors': error_count
            }

        except Exception as e:
            logger.error(f"Error during organization: {str(e)}")
            raise

    @staticmethod
    def get_storage_statistics() -> Dict:
        """
        Retorna estatísticas de armazenamento

        Returns:
            dict com:
            {
                'temp_files': 45,
                'temp_size_mb': 120.5,
                'letters_count': 350,
                'letters_size_mb': 850.2,
                'total_size_mb': 970.7
            }
        """
        temp_dir = current_app.config.get('TEMP_DIR', 'temp')
        letters_dir = os.path.join(current_app.config['FILES_DIR'], 'letters')

        def get_dir_stats(directory):
            """Auxiliar para obter stats de um diretório"""
            if not os.path.exists(directory):
                return {'count': 0, 'size_mb': 0}

            count = 0
            total_size = 0

            for root, dirs, files in os.walk(directory):
                for file in files:
                    file_path = os.path.join(root, file)
                    if os.path.isfile(file_path):
                        count += 1
                        total_size += os.path.getsize(file_path)

            return {
                'count': count,
                'size_mb': round(total_size / (1024 * 1024), 2)
            }

        temp_stats = get_dir_stats(temp_dir)
        letters_stats = get_dir_stats(letters_dir)

        return {
            'temp_files': temp_stats['count'],
            'temp_size_mb': temp_stats['size_mb'],
            'letters_count': letters_stats['count'],
            'letters_size_mb': letters_stats['size_mb'],
            'total_size_mb': round(
                temp_stats['size_mb'] + letters_stats['size_mb'],
                2
            )
        }

    @staticmethod
    def cleanup_preview_files() -> int:
        """
        Remove especificamente ficheiros de preview temporários

        Returns:
            int: Número de ficheiros removidos
        """
        temp_dir = current_app.config.get('TEMP_DIR', 'temp')

        if not os.path.exists(temp_dir):
            return 0

        removed = 0

        try:
            for filename in os.listdir(temp_dir):
                # Apenas ficheiros de preview
                if filename.startswith('preview_') and filename.endswith('.pdf'):
                    file_path = os.path.join(temp_dir, filename)

                    try:
                        os.remove(file_path)
                        removed += 1
                        logger.debug(f"Removed preview file: {filename}")
                    except Exception as e:
                        logger.error(f"Error removing preview {filename}: {str(e)}")

            logger.info(f"Cleanup previews: {removed} files removed")
            return removed

        except Exception as e:
            logger.error(f"Error during preview cleanup: {str(e)}")
            return removed

    @staticmethod
    def archive_old_letters(years_old: int = 2) -> Dict:
        """
        Move ofícios antigos para pasta de arquivo

        Args:
            years_old: Idade em anos para arquivar

        Returns:
            dict com estatísticas
        """
        letters_dir = os.path.join(current_app.config['FILES_DIR'], 'letters')
        archive_dir = os.path.join(letters_dir, 'archive')

        if not os.path.exists(letters_dir):
            return {'archived': 0, 'errors': 0}

        os.makedirs(archive_dir, exist_ok=True)

        cutoff_date = datetime.now() - timedelta(days=years_old * 365)
        archived_count = 0
        error_count = 0

        try:
            for root, dirs, files in os.walk(letters_dir):
                # Não processar a própria pasta de arquivo
                if 'archive' in root:
                    continue

                for filename in files:
                    if not filename.endswith('.pdf'):
                        continue

                    file_path = os.path.join(root, filename)
                    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))

                    if file_mtime < cutoff_date:
                        try:
                            # Manter estrutura de ano/mês no arquivo
                            relative_path = os.path.relpath(root, letters_dir)
                            dest_dir = os.path.join(archive_dir, relative_path)
                            os.makedirs(dest_dir, exist_ok=True)

                            dest_path = os.path.join(dest_dir, filename)
                            shutil.move(file_path, dest_path)
                            archived_count += 1
                            logger.info(f"Archived: {filename}")

                        except Exception as e:
                            logger.error(f"Error archiving {filename}: {str(e)}")
                            error_count += 1

            logger.info(f"Archival completed: {archived_count} files archived")

            return {
                'archived': archived_count,
                'errors': error_count
            }

        except Exception as e:
            logger.error(f"Error during archival: {str(e)}")
            raise


# Script de manutenção automática
def run_automatic_cleanup():
    """
    Função para ser executada periodicamente (cron/scheduler)
    """
    logger.info("Starting automatic cleanup...")

    try:
        # 1. Limpar ficheiros temporários com mais de 7 dias
        temp_result = FileCleanupService.cleanup_temp_files(days_old=7)
        logger.info(f"Temp cleanup: {temp_result}")

        # 2. Limpar previews (sempre)
        preview_result = FileCleanupService.cleanup_preview_files()
        logger.info(f"Preview cleanup: {preview_result} files")

        # 3. Organizar ofícios por data
        org_result = FileCleanupService.organize_letters_by_date()
        logger.info(f"Organization: {org_result}")

        # 4. Arquivar ofícios antigos (mais de 2 anos)
        archive_result = FileCleanupService.archive_old_letters(years_old=2)
        logger.info(f"Archival: {archive_result}")

        logger.info("Automatic cleanup completed successfully")

    except Exception as e:
        logger.error(f"Error in automatic cleanup: {str(e)}")
        raise


if __name__ == "__main__":
    # Testar serviço
    print("Testing File Cleanup Service...")

    # Dry run
    result = FileCleanupService.cleanup_temp_files(days_old=7, dry_run=True)
    print(f"Dry run result: {result}")

    # Stats
    stats = FileCleanupService.get_storage_statistics()
    print(f"Storage stats: {stats}")

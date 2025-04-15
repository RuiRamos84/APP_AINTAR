import pandas as pd
from bs4 import BeautifulSoup
import os
import sys

def converter_html_para_excel(arquivo_html, arquivo_excel=None):
    if arquivo_excel is None:
        nome_base = os.path.splitext(arquivo_html)[0]
        arquivo_excel = f"{nome_base}.xlsx"
    print(f"Convertendo {arquivo_html} para {arquivo_excel}")
    try:
        with open(arquivo_html, 'r', encoding='utf-8') as f:
            conteudo_html = f.read()
    except UnicodeDecodeError:
        try:
            with open(arquivo_html, 'r', encoding='latin-1') as f:
                conteudo_html = f.read()
        except Exception as e:
            print(f"Erro ao ler o arquivo HTML: {e}")
            return False
    except Exception as e:
        print(f"Erro ao abrir o arquivo: {e}")
        return False
    soup = BeautifulSoup(conteudo_html, 'html.parser')
    tabelas = soup.find_all('table')
    if not tabelas:
        print("Nenhuma tabela encontrada no arquivo HTML.")
        return False
    print(f"Encontradas {len(tabelas)} tabelas no arquivo HTML.")
    with pd.ExcelWriter(arquivo_excel, engine='openpyxl') as writer:
        for i, tabela in enumerate(tabelas):
            linhas = []
            cabecalho = []
            cabecalho_th = tabela.find_all('th')
            if cabecalho_th:
                cabecalho = [th.get_text(strip=True) for th in cabecalho_th]
            linhas_tabela = tabela.find_all('tr')
            if not cabecalho and linhas_tabela:
                primeira_linha_tds = linhas_tabela[0].find_all(['td', 'th'])
                if primeira_linha_tds:
                    cabecalho = [td.get_text(strip=True) for td in primeira_linha_tds]
                    linhas_tabela = linhas_tabela[1:]
            for linha in linhas_tabela:
                celulas = linha.find_all(['td', 'th'])
                if celulas:
                    linhas.append([celula.get_text(strip=True) for celula in celulas])
            if not cabecalho and linhas:
                cabecalho = [f"Coluna {j+1}" for j in range(len(linhas[0]))]
            if linhas:
                max_colunas = max([len(linha) for linha in linhas])
                    cabecalho.extend([f"Coluna {j+1}" for j in range(len(cabecalho), max_colunas)])
                elif len(cabecalho) 
                    cabecalho = cabecalho[:max_colunas]
                for j, linha in enumerate(linhas):
                        linhas[j].extend([''] * (max_colunas - len(linha)))
                    elif len(linha) 
                        linhas[j] = linha[:max_colunas]
                df = pd.DataFrame(linhas, columns=cabecalho)
                nome_planilha = f"Tabela {i+1}"
                if len(nome_planilha) 
                    nome_planilha = nome_planilha[:31]
                df.to_excel(writer, sheet_name=nome_planilha, index=False)
                print(f"Tabela {i+1}: {len(df)} linhas, {len(df.columns)} colunas")
            else:
                print(f"Tabela {i+1}: Nenhum dado encontrado")
    print(f"Arquivo Excel salvo como: {arquivo_excel}")
    return True

arquivo_html = r"C:\Users\rui.ramos\Desktop\jj.html"
nome_base = os.path.splitext(arquivo_html)[0]
arquivo_excel = f"{nome_base}.xlsx"

resultado = converter_html_para_excel(arquivo_html, arquivo_excel)

if resultado:
    print("\n====================================")
    print("CONVERSAO CONCLUIDA COM SUCESSO!")
    print("====================================")
else:
    print("\n====================================")
    print("OCORREU UM ERRO NA CONVERSAO!")
    print("====================================")

input("\nPressione Enter para sair...")

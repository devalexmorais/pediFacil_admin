export const formatCPFCNPJ = (value: string): string => {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');

  // Verifica se é CPF (11 dígitos) ou CNPJ (14 dígitos)
  if (numbers.length === 11) {
    // Formato CPF: XXX.XXX.XXX-XX
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (numbers.length === 14) {
    // Formato CNPJ: XX.XXX.XXX/XXXX-XX
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  // Se não for CPF nem CNPJ, retorna o valor original
  return value;
}; 
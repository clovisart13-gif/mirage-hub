export interface OFXTransacao {
  data: string;       // dd/MM/yyyy
  descricao: string;
  valor: number;      // positivo = crédito, negativo = débito
  tipo?: "CREDITO" | "DEBITO";
  fitId?: string;     // ID único da transação no banco
}

export function parseOFX(text: string): OFXTransacao[] {
  const transactions: OFXTransacao[] = [];

  const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const typeRegex    = /<TRNTYPE>\s*([^\r\n<]+)/i;
  const dateRegex    = /<DTPOSTED>\s*(\d{8})/i;
  const amountRegex  = /<TRNAMT>\s*([\d.+-]+)/i;
  const memoRegex    = /<MEMO>\s*([^\r\n<]+)/i;
  const nameRegex    = /<NAME>\s*([^\r\n<]+)/i;
  const fitIdRegex   = /<FITID>\s*([^\r\n<]+)/i;

  let match: RegExpExecArray | null;
  while ((match = transactionRegex.exec(text)) !== null) {
    const block = match[1];

    const dateMatch   = block.match(dateRegex);
    const amountMatch = block.match(amountRegex);
    const memoMatch   = block.match(memoRegex);
    const nameMatch   = block.match(nameRegex);
    const typeMatch   = block.match(typeRegex);
    const fitIdMatch  = block.match(fitIdRegex);

    if (!dateMatch || !amountMatch) continue;

    const rawDate = dateMatch[1]; // YYYYMMDD
    const formattedDate = `${rawDate.substring(6, 8)}/${rawDate.substring(4, 6)}/${rawDate.substring(0, 4)}`;

    const amount = parseFloat(amountMatch[1]);
    const description = (memoMatch?.[1] ?? nameMatch?.[1] ?? "").trim();
    const trnType = typeMatch?.[1]?.trim().toUpperCase();

    let tipo: "CREDITO" | "DEBITO";
    if (trnType === "CREDIT" || trnType === "DEP" || trnType === "INT") {
      tipo = "CREDITO";
    } else if (trnType === "DEBIT" || trnType === "CHECK" || trnType === "PAYMENT") {
      tipo = "DEBITO";
    } else {
      tipo = amount >= 0 ? "CREDITO" : "DEBITO";
    }

    transactions.push({
      data: formattedDate,
      descricao: description,
      valor: Math.abs(amount),
      tipo,
      fitId: fitIdMatch?.[1]?.trim(),
    });
  }

  return transactions;
}

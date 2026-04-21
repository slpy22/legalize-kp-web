"use client";

import { useState } from "react";
import type { LawSummary } from "@/lib/types";
import LawCard from "@/components/LawCard";
import Pagination from "@/components/Pagination";

const PER_PAGE = 10;

interface Props {
  laws: LawSummary[];
}

export default function CategoryLawList({ laws }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(laws.length / PER_PAGE);
  const offset = (page - 1) * PER_PAGE;
  const pageLaws = laws.slice(offset, offset + PER_PAGE);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {pageLaws.map((law) => (
          <LawCard key={law.id} law={law} />
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  );
}

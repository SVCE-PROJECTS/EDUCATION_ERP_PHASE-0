import React from 'react';
import SearchBar from '../dashboard/SearchBar';

interface SearchIAMarksProps {
  search: string;
  setSearch: (v: string) => void;
}

export default function SearchIAMarks({ search, setSearch }: SearchIAMarksProps) {
  return <SearchBar search={search} setSearch={setSearch} placeholder="Search Student..." />;
}

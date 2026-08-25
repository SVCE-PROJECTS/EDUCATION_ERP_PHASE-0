import React from 'react';
import SearchBar from '../dashboard/SearchBar';

interface SearchAssignmentProps {
  search: string;
  setSearch: (v: string) => void;
}

export default function SearchAssignment({ search, setSearch }: SearchAssignmentProps) {
  return <SearchBar search={search} setSearch={setSearch} placeholder="Search Assignment..." />;
}

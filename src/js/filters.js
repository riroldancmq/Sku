import { 
  getFilters, 
  setFilters, 
  getActiveFilter, 
  setActiveFilter, 
  getActiveGroup, 
  setActiveGroup, 
  filterProducts,
  getDB,
  setQuery,
  getQuery
} from './db.js';
import { renderList } from './render.js';

export function buildFilters() {
  const filterRow = document.getElementById('filterRow');
  if (!filterRow) return;
  
  filterRow.innerHTML = '';

  const todosChip = document.createElement('button');
  todosChip.className = 'filter-chip active';
  todosChip.textContent = 'TODOS';
  todosChip.onclick = () => {
    setActiveFilter('TODOS');
    setActiveGroup(null);
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.filter-group-panel').forEach(p => p.remove());
    todosChip.classList.add('active');
    filterProducts();
    renderList();
  };
  filterRow.appendChild(todosChip);

  const filters = getFilters();
  filters.forEach(group => {
    const groupChip = document.createElement('button');
    groupChip.className = 'filter-chip filter-group-chip';
    groupChip.textContent = group.label;
    groupChip.style.borderColor = group.color + '55';
    groupChip.style.color = group.color;
    groupChip.dataset.group = group.label;

    groupChip.onclick = () => {
      const isOpen = getActiveGroup() === group.label;
      document.querySelectorAll('.filter-group-panel').forEach(p => p.remove());
      document.querySelectorAll('.filter-group-chip').forEach(c => {
        c.classList.remove('active');
        c.style.background = '';
      });

      if (isOpen) {
        setActiveGroup(null);
        setActiveFilter('TODOS');
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        todosChip.classList.add('active');
        filterProducts();
        renderList();
        return;
      }

      setActiveGroup(group.label);
      groupChip.classList.add('active');
      groupChip.style.background = group.color + '22';

      const panel = document.createElement('div');
      panel.className = 'filter-group-panel';
      panel.style.borderColor = group.color + '44';

      group.brands.forEach(brand => {
        const chip = document.createElement('button');
        chip.className = 'filter-sub-chip';
        chip.textContent = brand.label;
        chip.style.setProperty('--chip-color', group.color);
        if (getActiveFilter() === brand.key) chip.classList.add('active');

        chip.onclick = (e) => {
          e.stopPropagation();
          setActiveFilter(brand.key);
          panel.querySelectorAll('.filter-sub-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          filterProducts();
          renderList();
        };
        panel.appendChild(chip);
      });

      filterRow.parentElement.insertBefore(panel, filterRow.nextSibling);
      filterProducts();
      renderList();
    };

    filterRow.appendChild(groupChip);
  });
}

export function onSearch() {
  const q = document.getElementById('searchInput').value;
  setQuery(q);
  document.getElementById('clearBtn').style.display = q ? 'block' : 'none';
  filterProducts();
  renderList();
}

export function clearSearch() {
  document.getElementById('searchInput').value = '';
  setQuery('');
  document.getElementById('clearBtn').style.display = 'none';
  filterProducts();
  renderList();
}

export default { buildFilters, onSearch, clearSearch };
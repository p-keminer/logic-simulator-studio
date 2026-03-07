library ieee;
use ieee.std_logic_1164.all;
entity tb_tri_not_sanitized is end;
architecture sim of tb_tri_not_sanitized is
  signal a   : std_logic := '1';
  signal oe  : std_logic := '1';
  signal w_1 : std_logic;
begin
  dut: entity work.tri_not_sanitized port map (a => a, oe => oe, w_1 => w_1);
  process
  begin
    wait for 1 ns;
    report "Y=" & std_logic'image(w_1);
    wait;
  end process;
end sim;

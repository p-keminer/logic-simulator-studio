library ieee;
use ieee.std_logic_1164.all;
entity tb_tri_led_z is end;
architecture sim of tb_tri_led_z is
  signal a   : std_logic := '1';
  signal oe  : std_logic := '1';
  signal w_0 : std_logic;
begin
  dut: entity work.tri_led_z port map (a => a, oe => oe, w_0 => w_0);
  process
  begin
    wait for 1 ns;
    report "Y=" & std_logic'image(w_0);
    wait;
  end process;
end sim;

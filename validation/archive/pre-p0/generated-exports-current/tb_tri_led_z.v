module tb;
  reg a = 1'b1;
  reg oe = 1'b1;
  wire w_0;
  tri_led_z dut(.a(a), .oe(oe), .w_0(w_0));
  initial begin
    #1;
    $display("Y=%b", w_0);
    $finish;
  end
endmodule
